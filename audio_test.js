const say = require('say');

say.stop();

say.speak("Audio test", "Alex", 1.1, (err) => {
                    
    if (err){
        console.log(err);
    }
});