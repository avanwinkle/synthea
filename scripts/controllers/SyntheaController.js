(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SyntheaController", SyntheaController);

SyntheaController.$inject = ['SynMixer','SynProject','$location','$log','$q','$scope','$timeout'];

function SyntheaController(SynMixer,SynProject,$location,$log,$q,$scope,$timeout) {

    var sVm = this;
    window.sVm = sVm;
    this.SynMixer_ = SynMixer;
    this.SynProject_ = SynProject;
    this.$location_ = $location;
    this.$log_ = $log;
    this.$q_ = $q;
    this.$timeout_ = $timeout;

    this.ready = false;

    // We need to track some variables
    var vars = {
        is_dj_mode: false,
    };

    ipcRenderer.on('edit-project', function(evt,projectDef) {

        // Are we passing in a new project to edit?
        if (projectDef) {
            sVm.loadProject(projectDef).then(function(project) {
                $location.path('/edit/'+project.key);
            });
        }
        // No? Then use the current project
        else {
            $location.path('/edit/'+
                this.SynProject_.getProject().key);
            $scope.$apply();

        }

    }.bind(this));

    // Listen for the main application to broadcast a project change
    ipcRenderer.on('open-project', (event,projectDef,projectLayout) => {
        // Clear out the current project to trigger the animation

        this.$timeout_(() => {
            sVm.ready = false;
        },0);


        this.$timeout_(() => {
            // Did we get a project?
            if (projectDef) {
                // Open it!
                sVm.loadProject(projectDef,projectLayout);
            }
            // If we didn't get a project, clear out
            else {
                // Clear out any older project
                sVm.project = undefined;
                $location.path('/landing');
                // Nice title
                document.title = "Synthea";

                // This is an external callback, so time to digest!
                $scope.$apply();

                // In the above IF, we rely on loadProject to trigger sVm.ready
                this.$timeout_(() => {
                    sVm.ready = true;
                }, 500)
            }
        },500);

    });

    ipcRenderer.on('reset-audio-engine', this.resetAudioEngine.bind(this));


    document.addEventListener('keyup', function(e) {

        // If we're in an input, DON'T trigger any keypress events
        if (e.target.nodeName === 'INPUT') {
            return;
        }

        switch (e.code) {
            case 'ArrowRight':
                this.selectPage('next');
                break;
            case 'ArrowLeft':
                this.selectPage('prev');
                break;
            case 'Escape':
                // Don't let this be accidental, because it's not graceful
                if (e.ctrlKey) {
                    this.resetAudioEngine();
                }
                break;
        }

        // This is a non-angular event
        $scope.$apply();
    }.bind(this));


}

SyntheaController.prototype.browseCloudProjects = function() {
    ipcRenderer.send('browse-cloud-projects');
};


SyntheaController.prototype.createProject = function() {
    ipcRenderer.send('open-create-project');
};


SyntheaController.prototype.loadProject = function(projectDef,projectLayout) {

    var defer = this.$q_.defer();

    // Tell the project service to do its business
    this.SynProject_.load(projectDef,projectLayout).then(function() {

        this.project = this.SynProject_.getProject();

        // Get a page object and select it for our initial display
        this.selectPage( this.SynProject_.getPage() );

        // And a nice title
        document.title = 'Synthea: ' + this.project.name;

        // Trigger a route change!
        this.$location_.path('/player/'+projectDef.key).replace();

        // Ready! But delay it by an animation duration
        this.$timeout_(() => {
            this.ready = true;
        }, 500);

        defer.resolve(this.project);

    }.bind(this));

    return defer.promise;

};

SyntheaController.prototype.openProjectFromFolder = function() {
    ipcRenderer.send('open-project-from-folder');
};

SyntheaController.prototype.openWeburl = function(url) {
    ipcRenderer.send('open-weburl', url);
};

SyntheaController.prototype.resetAudioEngine = function() {
    // Hard kill the mixer
    this.SynMixer_.getMixer().stop(true,true);
    // Kill Howler
    var h = require('howler');
    if (h.ctx) {
        h.Howler.unload();
        h.Howler.init();
    }
};

/**
 * A method to select a page of sections/cues in the project. This is part of
 * the main controller because it's shared between SynPlayerController and
 * SynEditorController.
 *
 * @param  {Page} page A page object from the Project layout
 * @return {Page} The same page, set as `sVm.currentPage`
 */
SyntheaController.prototype.selectPage = function(page) {
    var pages = this.project.pages;
    var currentIdx = pages.indexOf(this.currentPage);

    // We can scroll
    if (page==='next') {
        if (currentIdx < pages.length-1) {
            page = pages[currentIdx + 1];
        } else {
            page = pages[0];
        }
    }
    else if (page==='prev') {
        if (currentIdx === 0) {
            page = pages[pages.length-1];
        } else {
            page = pages[currentIdx - 1];
        }
    }

    // Store this page so we can show it on the view
    this.currentPage = page;
    return page;
};

// IIFE
})();
