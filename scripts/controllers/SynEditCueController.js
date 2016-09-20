(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynEditCueController', SynEditCueController);

SynEditCueController.$inject = ['SynChannel','SynProject','$mdDialog'];

/**
 * Controller for the modal to edit a single cue (includes creating new cues)
 */
function SynEditCueController(SynChannel,SynProject,$mdDialog) {

    var secVm = this;

    this.SynProject_ = SynProject;
    this.$mdDialog_ = $mdDialog;


    // Make a channel to preview sources
    this.channel = new SynChannel();

    // The files selected in the file menu are not immediately atteched
    secVm.selectedFiles = [];

    this.activate();
}

/**
 * Activation function fetches the project media list
 */
SynEditCueController.prototype.activate = function() {

    // get the media list
    this.SynProject_.getProjectMediaList().then(function(response) {
        this.mediaList = response;
    }.bind(this));

    // Make a holding value for the volume
    this.volume_pct = this.cue.volume * 100 || undefined;


};

/**
 * Bind the $mdDialog service cancel method to the view model
 */
SynEditCueController.prototype.$cancel = function() {
    this.$mdDialog_.cancel();
};

/**
 * Bind the $mdDialog service close method to the view model
 */
SynEditCueController.prototype.$close = function() {
    // Set the real volume, if need be
    if (this.volume_pct) {
        this.cue.volume = this.volume_pct / 100;
    }
    this.$mdDialog_.hide(this.cue);
};

/**
 * Method to add all selected media files as sources to the opened cue. Will
 * only add files that aren't already sources.
 */
SynEditCueController.prototype.addFilesToCue = function() {

    // Iterate the selection so we don't duplicate files already there
    angular.forEach(this.selectedFiles, function(f) {
        if (this.cue.sources.indexOf(f)===-1) {
            this.cue.sources.push(f);
        }
    }.bind(this));

    // If we don't have a title for this cue? Let's be nice and make one!
    if (!this.cue.name && this.cue.sources.length) {

        var whitespace = /[_-]/g;
        var leadingnums = /^([0-9\W]*)/;
        var titlecase = /(\b[a-z](?!\s))/g;

        var name = this.cue.sources[0].split('.')[0]
            .replace(whitespace,' ')
            .replace(leadingnums,'')
            .replace(titlecase, function(x){return x.toUpperCase();})
            .trim();

        this.cue.name = name;
    }

};

/**
 * Remove all sources from the cue
 */
SynEditCueController.prototype.clearSources = function() {
    this.cue.sources = [];
};

/**
 * Call the SynProject service to add media to the project, and (by default)
 * automatically attach any newly-added media as sources to this cue
 */
SynEditCueController.prototype.copyMediaToProject = function() {

    // Make a copy of the current list so we can see what's added
    var oldList = angular.copy(this.mediaList);

    this.SynProject_.copyMediaToProject().then(function(response) {
        this.mediaList = response;
        // For clarity, delesect anything that was previously selected
        this.selectedFiles = [];

        // Select anything that's new
        angular.forEach(this.mediaList, function(filename) {
            if (oldList.indexOf(filename)===-1) {
                this.selectedFiles.push(filename);
            }
        }.bind(this));

        // For convenience, assume the newly added media should go to the cue?
        this.addFilesToCue();

    }.bind(this));
};

/**
 * Delete this cue! Also, closes the modal
 */
SynEditCueController.prototype.deleteCue = function() {
    this.$mdDialog_.hide(null);
};

/**
 * Remove a media file as a source on the cue
 * @param  {string} filename Name of the source file to remove
 */
SynEditCueController.prototype.removeSource = function(filename) {

    if (this.cue.sources.indexOf(filename) !== -1) {
        this.cue.sources.splice(this.cue.sources.indexOf(filename),1);
    }

};

SynEditCueController.prototype.selectAssignedMedia = function(src) {
    console.log('select media:',src)
    // Unselect?
    if (!src) {
        this.selectedAssignedMedia = undefined;
        return;
    }
    // From the multi-select?
    else if (src === 'select') {
        src = this.selectedFiles[0];
    }
    // If it's an assigned media, clear the select
    else {
        this.selectedFiles.splice(0);
    }

    this.selectedAssignedMedia = src;

    // Stop! For reals!
    this.channel.stop({forceUnload:true}).then(function() {

        this.channel.loadCue({
            _fullPath: this.SynProject_.getProjectDef().documentRoot + '/audio/' + src,
            name: src,
            isFadeIn: false,
            isLoop: false,
        }, {
            dontUnload: true,
            forceFadeOut: false,
        });

    }.bind(this));

};

SynEditCueController.prototype.updateVolume = function() {
    // Nothing?
    if (!this.volume_pct && this.volume_pct !== 0) {
        this.volume_pct = 100;
    }
    // Coerce the constraints to be valid
    else {
        this.volume_pct = Math.max(0, Math.min(this.volume_pct,200));
    }
    // Change the player volume level without changing the cue
    this.channel.setFullVolume(this.volume_pct);
};

// IIFE
})();