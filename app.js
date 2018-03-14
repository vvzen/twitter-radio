const fs = require('fs');
const Twit = require('twit');
const say = require('say');

var listening_words = ["generative art", "art", "facebook"];
var voices = {
    "en" : ["Alex", "Karen", "Fred", "Moira"],
    "it" : ["Luca", "Alice"]
};

var twitter_auth = JSON.parse(fs.readFileSync("auth.json"));

var T = new Twit({
    consumer_key: twitter_auth.consumer_key,
    consumer_secret: twitter_auth.consumer_secret,
    access_token: twitter_auth.access_token,
    access_token_secret: twitter_auth.access_token_secret,
    timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
});

// Create a stream object that filters the public stream
var stream = T.stream("statuses/filter", {
    track: listening_words,
    language: "en"
});

console.log(`started streaming on ${listening_words.toString()}`);

say.stop();

// Start streaming
stream.on("tweet", function (tweet) {
    // console.log(tweet.text);

    // remove the https string from the text using a regex
    var text_cleaned = tweet.text.split(/https:\/\/\w+.co\/\w+/);

    if (text_cleaned.length > 0){
        
        //say.stop();
        stream.stop();

        let current_voice = voices.en[Math.floor(Math.random()*voices.en.length)];

        say.speak(text_cleaned[0], current_voice, 1.1, (err) => {
            
            if (err){
                console.log(err);
            }

            stream.start();
        });
        console.log("heard a new tweet!");
    }
});