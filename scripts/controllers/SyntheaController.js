(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SyntheaController", SyntheaController);

SyntheaController.$inject = ['SynProject','$location','$log','$scope','$timeout'];

function SyntheaController(SynProject,$location,$log,$scope,$timeout) {

    var sVm = this;
    window.sVm = sVm;
    this.SynProject_ = SynProject
    this.$location_ = $location;
    this.$log_ = $log;
    this.$timeout_ = $timeout;

    // We need a mixer
    var mixer;
    // We need to track some variables
    var vars = {
        is_dj_mode: false,
    };

    ipcRenderer.on('edit-project', function(evt) {
        $location.path('/edit/'+this.SynProject_.getProject().key);
        $scope.$apply();
    }.bind(this));

    // Listen for the main application to broadcast a project change
    ipcRenderer.on('open-project', function(event,projectDef) {

        // Did we get a null?
        if (projectDef) {
            sVm.loadProject(projectDef);
        }
        else {
            // Hearing this broadcast means we're ready
            sVm.ready = true;
            // Clear out any older project
            sVm.project = undefined;
            $location.path('/');

            // This is an external callback, so time to digest!
            $scope.$apply();
        }
    });

    activate();

    function activate() {
        $location.path('/');
    }

}


SyntheaController.prototype.createProject = function() {
    ipcRenderer.send('create-project');
};


SyntheaController.prototype.loadProject = function(projectDef) {

    // Tell the project service to do its business
    this.SynProject_.load(projectDef).then(function() {

        this.project = this.SynProject_.getProject();
        console.log("Project loaded!",this.project)
        // Trigger a route change!
        this.$location_.path('/player/'+projectDef.key);

    }.bind(this));

};


// IIFE
})();