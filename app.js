const fs = require('fs');
const Twit = require('twit');
const say = require('say');

var voices = {
    "en" : ["Alex", "Karen", "Fred", "Moira"],
    "it" : ["Luca", "Alice"]
};

const twitter_auth = JSON.parse(fs.readFileSync("auth.json"));

// Twit object for accessing twitter api
const T = new Twit({
    consumer_key: twitter_auth.consumer_key,
    consumer_secret: twitter_auth.consumer_secret,
    access_token: twitter_auth.access_token,
    access_token_secret: twitter_auth.access_token_secret,
    timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
});

// for reading user input
var stdin = process.stdin;

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();
stdin.setRawMode(true);
stdin.setEncoding("utf8"); // i don't want binary, do you?

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
        console.log(`started streaming on ${current_keywords}\n`);
        
        say.stop();
        
        // Create a stream object that filters the public stream
        var stream = T.stream("statuses/filter", {
            track: current_keywords,
            language: "en"
        });

        // Start streaming
        stream.on("tweet", (tweet) => {
            // console.log(tweet.text);

            // remove the https string from the text using a regex
            var text_cleaned = tweet.text.split(/https:\/\/\w+.co\/\w+/);

            if (text_cleaned.length > 0){
                
                say.stop();
                stream.stop();

                let current_voice = voices.en[Math.floor(Math.random()*voices.en.length)];

                say.speak(text_cleaned[0], current_voice, 1.1, (err) => {
                    
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
    }
    // on backspace, remove last letter
    else if (key.name === 'backspace'){
        current_keywords = current_keywords.slice(0, -1);
    }
    else {
        current_keywords += letter;
    }
});