const fs = require('fs');
const Twit = require('twit');
const say = require('say');
const readline = require('readline');
const SerialPort = require('serialport');

var port = new SerialPort("/dev/ttyUSB0", {autoOpen:true, baudRate: 9600}, (err) => {

    if (err) console.log("Error when opening port: ", err.message);

});

var voices = {
    "us" : ["voice_cmu_us_clb_arctic_clunits"]
};
//    "us" : ["voice_cmu_us_clb_arctic_clunits", "voice_ked_diphone"]

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
    
    // on ctrl-c
    if (key.sequence === '\u0003'){
        console.log("exiting..");
        say.stop();
        process.exit();
    }
    // on enter press
    else if (key.sequence === '\r'){

        // write current words on serial 
        port.write(`d:${current_keywords}\n`, (err) => {

            if (err) console.log("Error when writing to port: ", err.message);
    
            console.log(`started streaming on ${current_keywords}\n`);
        
            say.stop();
            
            // Create a stream object that filters the public stream
            var stream = T.stream("statuses/filter", {
                track: current_keywords,
                language: "en"
            });

            // Start streaming
            stream.on("tweet", (tweet) => {

                fs.writeFileSync("test.json", JSON.stringify(tweet));
                
                console.log(tweet);
                console.log("extended tweet text: ")
                console.log(tweet.retweeted_status.extended_tweet.full_text);
                
                let text_cleaned;
                // remove the https string from the text using a regex
                if (tweet.extended_tweet !== undefined){
                    text_cleaned = tweet.extended_tweet.full_text.split(/https:\/\/\w+.co\/\w+/);
                }
                else if ((tweet.text.indexOf("RT") > -1) && (tweet.retweeted_status !== undefined)){
                    text_cleaned = tweet.retweeted_status.extended_tweet.full_text.split(/https:\/\/\w+.co\/\w+/);
                }
                else {
                    text_cleaned = tweet.text.split(/https:\/\/\w+.co\/\w+/);
                }

                //var text_cleaned = tweet.extended_tweet.full_text.split(/https:\/\/\w+.co\/\w+/);
                
                //FIXME: solve error when tweet contains apostrophes
                //text_cleaned[0] = text_cleaned[0].replace('"', '').text_cleaned[0].replace("'", "");

                if (text_cleaned.length > 0){

                    text_cleaned = text_cleaned[0];
                    text_cleaned = text_cleaned.replace('"', '');
                    text_cleaned = text_cleaned.replace('…', '');                             
                    
                    say.stop();
                    stream.stop();

                    console.log(text_cleaned);

                    let current_voice = voices.us[Math.floor(Math.random()*voices.us.length)];

                    say.speak(text_cleaned, current_voice, 1.0, (err) => {
                        
                        if (err){
                            console.log(err);
                        }
                        else {
                            stream.start();
                        }
                    });
                    console.log("heard a new tweet!");
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