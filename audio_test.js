const say = require('say');


let current_voice;
if (process.platform == "linux"){
    current_voice = "voice_default";
}
else {
    current_voice = "Alex";    
}

say.speak("Hello this is an audio test", current_voice, 1.0, (err) => {
                    
    if (err){
        console.log(err);
    }
});