# SYNTHEA Soundboard

Short for **SYN**thetic **THE**ater **A**udio, ***Synthea*** is a customizable soundboard program designed for dynamic playback of
dialogue, sound effects, and music in unscripted environments. It was written for use in improvised theater, but
is suitable in any live performance where pre-programmed cues are not sufficient.

***Synthea*** is an Electron-based Angular-powered application that generates a tabbed software soundboard for realtime playback of dialogue,
sound effects, and music. Playback options include simultaneous, sequential, and crossfade; cues can be looped or
randomized; hotkeys can be bound, and much more. Key features include:

 - Distinct Playback Behaviors for Dialogue, Sound Effects, and Music Modes
 - Individual Playback Controls for Each Playing Cue
 - Effects Queue to Build Cue List and Delay Playback Until Unlock
 - Intuitive Tab-Based Interface to Store Hundreds of Unique Cues
 - Multiple Variations of a Cue Playable Randomly from a Single Cue Button
 - Programmable Hot-Keys for Instant Access to Common Cues
 - Modifier Key Support for Easy Hot-Key Iterations
 - Segmentable Intro, Outro, and Loop Parameters for Gapless Looping

***Synthea*** was originally written in Python with wxPython, PyGame, and VLC. It is
now being actively ported (here in this repo!) to an AngularJS web application wrapped by Electron.

## Why Synthea Exists

In unscripted theater, a sound board operator needs access to effects and music in ways that
scripted theater software cannot accomodate.

As a tech improviser, I once needed the ability to provide realtime, unscripted conversation
between performers onstage and an artificial intelligence controlled in the booth, and so ***Synthea*** was
created as means to seamlessly queue up a wide selection of pre-recorded sentence fragments and play them
back sequentially on demand.

***Synthea*** has since expanded to provide customized music and sound effects boards for numerous other
unscripted plays and improv performances, and continues to be developed for better and broader functionality.
It is still in its infancy, but for those willing and able to learn it, I hope it proves a useful tool.


## Installation

***Synthea*** can be built into a native application for Mac OS, Windows, and Linux, and when ready
those distributions will be linked to here. For now, you may clone this repo and run locally
or create your own builds.

**Developer Installation**

:anguished: _These instructions should work, but are untested!_
```
$ git clone https://github.com/avanwinkle/synthea.git
$ cd synthea
$ npm install
$ electron .
```

**Build Instructions**

Currently a build setup is only available for Mac OSX, which can be run using the following command (inside the synthea repo directory):

```$ npm run build```

For building on other systems, see the help output by running:

```$ electron-packager --help```

## Projects

For getting to know Synthea, there are a variety of sample projects available to stream. These
projects can be accessed in the menu at **Projects > Browse Cloud Projects...**.

_Please note that when streaming projects from the cloud, loops may not be gapless._

An upcoming feature is an internal project creator/editor, but in the meantime projects
must be created manually. You can create a project by making a new folder in the projects folder, whach can be accessed by the menu **Projects > Go to Projects Folder** (by default, %APPLICATION DATA%/Synthea/Projects). The projects folder can be changed via the menu **Projects > Change Projects Folder...**.

A project is defined by a JSON-formatted "layout" file, an optional banner image file, and an "audio" subfolder containing the cue files (accepting OGG, MP3, WAV, and other major formats).

_TODO: Use [asar](https://www.npmjs.com/package/asar) to package each project folder into a single archive file with a unique extension, e.g. myProject.synpkg_

#### Project Folder Layout
```
myProject
  | - layout
  | - my_project_banner.jpg
  | - audio /
  |      - soundfile.wav
  |      - musicfile.mp3
```

#### Sample Layout File

```JSON
{
    "name": "My Synthea Project",
    "bannerImage": "banner.jpg",    // Optional image
    "config": {
        "fadeInDuration": 1000,     // Default fade-in for cues (ms)
        "fadeOutDuration": 2000    // Default fade-out for cues (ms)
    },
    "pages": [
        {
            "display_order": 0,
            "id": 1,
            "name": "First Tab"
        }
    ],
    "columns": [
        {
            "display_order": 0,
            "id": 100,
            "name": "First Column",
            "page_id": 1
        }
    ],
    "buttons": [
        {
            "column_ids": [ 1 ],    // A button can appear in multiple columns
            "files": ["soundfile.wav"]  // A button can have multiple cue files
            "id": 1000,
            "isLoop": true,
            "name": "Basic Effect",
        },
        {
            "column_ids": [ 1 ],
            "files": ["musicfile.mp3"],
            "group": "MUSIC_"   // A reserved string for the music category
            "id": 1001,
            "isLoop": false,
            "name": "Music Song"
        }
    ],
    "hotKeys": {
        "KeyA": {               // The key event codename
            "action": "PLAY",   // A soundboard action
            "target": 1001     // Id of the button to target
        },
        "Ctrl.Shift.KeyB": {    // Modifier keys are supported
            "action": "PLAY",
            "target": 1000
        }
    }
}
```


## Credits

Synthea (Current)<br/>
&copy; 2016 Anthony van Winkle

Original Synthea<br/>&copy; 2011-2015 Anthony van Winkle<br/>with contributions by Dan Posluns and Tim Harahan
