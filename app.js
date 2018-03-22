const fs = require('fs');
const Twit = require('twit');
// const say = require('say'); // FIXME: REMOVE
const readline = require('readline');
const SerialPort = require('serialport');

// Load the SDK
const AWS = require('aws-sdk');
const Stream = require('stream');
const Speaker = require('speaker');

// SERIAL
// Serial Port  init
var port = new SerialPort("/dev/ttyUSB0", {autoOpen:true, baudRate: 9600}, (err) => {
    if (err) console.log("Error when opening port: ", err.message);
});

// TEXT TO SPEECH
// Create a AWS Polly client used for TTS
const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1'
})
var voices = {
    "en" : ["Geraint", "Salli", "Matthew", "Brian", "Amy"]
};
const SPEAKER_CONFIG = { channels: 1, bitDepth: 16, sampleRate: 16000 };

// console log the available voices
// Polly.describeVoices((err, data) => {
//     if (err) console.log(err, err.stack);
//     else console.log(data);
// })

const twitter_auth = JSON.parse(fs.readFileSync("auth.json"));

// Twit object for accessing twitter api
const T = new Twit({
    consumer_key: twitter_auth.consumer_key,
    consumer_secret: twitter_auth.consumer_secret,
    access_token: twitter_auth.access_token,
    access_token_secret: twitter_auth.access_token_secret,
    timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
});

// don't know why, but without this stdin won't work
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// object for reading user input
var stdin = process.stdin;

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();
stdin.setRawMode(true);
stdin.setEncoding("utf8"); // i don't want binary, do you?

/* // initial write on port
port.write("udooready\n", (err) => {

    if (err) console.log("Error when writing to port: ", err.message);

}); */

// on any data into stdin
var current_keywords = "";
console.log("What words should we listen to?");
stdin.on("keypress", (letter, key) => {

    // console.log(key);
    // console.log(`${letter}`);
    //console.log(`${current_keywords}`);

    let already_streaming = false;
    let twitter_stream;
    
    // on ctrl-c
    if (key.sequence === '\u0003'){
        console.log("exiting..");
        // say.stop();
        process.exit();
    }
    // on enter press
    else if (key.sequence === '\r'){

        // write current words on serial 
        port.write(`d:${current_keywords}\n`, (err) => {

            if (err) console.log("Error when writing to port: ", err.message);
    
            console.log(`started streaming on ${current_keywords}\n`);

            if (already_streaming && twitter_stream){
                console.log("stopping previous stream");
                twitter_stream.stop();
            }
        
            // Create a stream object that filters the public stream
            twitter_stream = T.stream("statuses/filter", {
                track: current_keywords,
                language: "en"
            });

            // Start streaming
            twitter_stream.on("tweet", (tweet) => {

                already_streaming = true;

                //fs.writeFileSync("test.json", JSON.stringify(tweet));
                
                if (process.env.DEBUG) console.log(tweet);
                
                let text_cleaned;
                // remove the https string from the text using a regex
                // and try to get the longer version of the tweet if possible
                if (tweet.extended_tweet !== undefined){
                    try {
                        text_cleaned = tweet.extended_tweet.full_text.split(/https:\/\/\w+.co\/\w+/);
                    }
                    catch (TypeError){
                        text_cleaned = tweet.text.split(/https:\/\/\w+.co\/\w+/);
                    }
                }
                else if (tweet.retweeted_status !== undefined){
                    try {
                        text_cleaned = tweet.retweeted_status.extended_tweet.full_text.split(/https:\/\/\w+.co\/\w+/);
                    }
                    catch (TypeError){
                        text_cleaned = tweet.text.split(/https:\/\/\w+.co\/\w+/);
                    }
                }
                else {
                    text_cleaned = tweet.text.split(/https:\/\/\w+.co\/\w+/);
                }

                //FIXME: solve error when tweet contains apostrophes
                
                // when there is one unmatched quote symbol, festival crashes
                // so only go on if we found 0 or 2
                var double_quotes_count = (text_cleaned[0].match(/"/g) || []).length;
                var single_quotes_count = (text_cleaned[0].match(/'/g) || []).length;
                if ((double_quotes_count == 0 || double_quotes_count > 1) && (single_quotes_count == 0 || single_quotes_count > 1)){
                    if (text_cleaned.length > 0){

                        text_cleaned = text_cleaned[0];
                        text_cleaned = text_cleaned.replace('"', '');
                        text_cleaned = text_cleaned.replace('…', '');
                        text_cleaned = text_cleaned.replace('“', '');
                        text_cleaned = text_cleaned.replace('”', '');                   
                        
                        // say.stop();
                        twitter_stream.stop();
                        
                        console.log("----------------------------------");
                        console.log(text_cleaned);
                        console.log("----------------------------------");
                        
                        // pick a random voice from the available ones
                        let current_voice = voices.en[Math.floor(Math.random()*voices.en.length)];
                        
                        let params = {
                            'Text': text_cleaned,
                            'OutputFormat': 'pcm',
                            'VoiceId': current_voice
                        }
    
                        try {
                            // synthesize the actual voice
                            Polly.synthesizeSpeech(params, (err, data) => {
                                if (err) {
                                    console.log(err.code)
                                }
                                else if (data) {
                                    if (data.AudioStream instanceof Buffer) {
                                        // Create a Speaker instance to play out audio
                                        const player = new Speaker(SPEAKER_CONFIG);
                                        // Initiate the source
                                        var buffer_stream = new Stream.PassThrough()
                                        // convert AudioStream into a readable stream
                                        buffer_stream.end(data.AudioStream)
                                        // Pipe into Player
                                        buffer_stream.pipe(player)
                                        // Callback when is done
                                        player.on("finish", () => {
                                            
                                            buffer_stream.unpipe(player);
                                            buffer_stream.end();
                                            player.close();
                                            twitter_stream.start();
                                            
                                        })
                                    }
                                }
                            });
                            console.log("heard a new tweet!");
                        }
                        catch (TypeError){
                            console.log("heard a new EMPTY tweet!");
                        }
                    }   
                }
            });
            
            current_keywords = "";
        });
    }
    // on backspace, remove last letter
    else if (key.name === 'backspace'){
        current_keywords = current_keywords.slice(0, -1);
    }
    else {
        current_keywords += letter;
    }
});