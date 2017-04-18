(function() {
'use strict';

angular
    .module('SyntheaModels', [])
    .factory('SynHowlPlayer', SynHowlPlayer);

SynHowlPlayer.$inject = ['$q', '$timeout'];

function SynHowlPlayer($q, $timeout) {

    function HowlPlayer(channel, defer) {
        // There might be multiple sources
        var targetSrc;
        var howl = {
            src: function(c) {
                // If there's only one, take it and be done
                if (c.sources.length===1) {
                    targetSrc = c.sources[0];
                }
                // If a target source is forced
                else if (channel.opts.targetSrc) {
                    targetSrc = channel.opts.targetSrc;
                }
                else {
                    // Track the last one we played, to avoid double-playing
                    while (!targetSrc || targetSrc === c._last_source) {
                        // Find a random source that is NOT the last one we played
                        targetSrc = c.sources[ Math.floor(Math.random() * c.sources.length) ];
                    }
                    // Note that this is the one we'll be playing
                    c._last_source = targetSrc;
                }
                // Return the full path of the determined target source
                return c._audioRoot + targetSrc;
            }(channel.media),
            // Additional params
            loop: channel.media.isLoop,
            html5: channel.opts.useWebAudio,
            preload: true,
            onend: function() {
                // This event fires at the end of each loop
                if (!channel.media.isLoop) {
                    channel.state = 'ENDED';
                    channel.is_playing = false;
                    // Clear out the channel.media and all relatedness
                    channel.stop();

                }
            },
            onload: function() {
                channel.duration = channel._player.duration();
                defer.resolve(channel.media);

                // We can prevent any default load behavior, e.g. temp players
                if (channel.opts.preventLoadDefault) {
                    return;
                }
                else if (channel.opts.autoplay) {
                    channel.play();
                }
                else {
                    // Wait a digest for this non-angular event
                    $timeout(function() {
                        // Occupied!
                        channel.state = 'QUEUED';
                        channel.is_queued = true;
                        channel.currentTime = 0;
                    },0);
                }
            },
            onloaderror: function(soundId,reason) {
                console.log("Load error!", reason);
                defer.reject(reason);
            },
            // onpause: function() {},
            // onplay: function() {}
        };

        // Sprites need to be tracked down
        if (targetSrc.indexOf('* ') !== -1) {
            // Create a sprite object with a property 'slice'
            howl.sprite = {'slice': channel.media._sprites[targetSrc].slice};
            // Replace the sprite name with the sprite source name
            howl.src = howl.src.replace(/\* .*/,channel.media._sprites[targetSrc].source);
        }

        return new Howl(howl);
    }

    return HowlPlayer;
}

// IIFE
})();
