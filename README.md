# SYNTHEA Soundboard

Short for **SYN**thetic **THE**ater **A**udio, ***Synthea*** is a customizable soundboard program designed for dynamic playback of
dialogue, sound effects, and music in unscripted environments. It was written for use in improvised theater, but
is suitable in any live performance where pre-programmed cues are not sufficient.

***Synthea*** displays a tabbed software soundboard for realtime playback of dialogue,
sound effects, and music. Playback options include simultaneous, sequential, and crossfade; cues can be looped or
randomized; hotkeys can be bound, and much more. Key features include:

 - **Distinct Playback Behaviors** for dialogue, sound effects, and music
 - **Individual Playback Controls** for each cue being played
 - **Effects Queue** to queue multiple files and playback on-demand
 - **Tab-Based, Multi-Column Interface** for rapid access to hundreds of cues
 - **Multiple Variations of a Cue** randomly played from a single cue button
 - **Programmable Hot-Keys** for instant access to frequently-used cuess
 - **Segmentable Intro, Outro, and Loop** options for gapless looping

***Synthea*** was originally written in Python with wxPython, PyGame, and VLC. It is
now being actively rebuilt (here in this repo!) from the ground up to be an AngularJS web application wrapped by Electron, with Howler powering the audio.

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

## Requirements

To develop and build ***Synthea***, you will need [NPM](https://www.npmjs.com/package/npm) and git. The application is built on the following platforms and frameworks:
 - [AngularJS](https://angularjs.org/)
 - [Angular Material](https://material.angularjs.org/)
 - [Electron](http://electron.atom.io/)
 - [Howler](https://howlerjs.com/)
 - [NodeFS](https://nodejs.org/api/fs.html)

All of these requirements can be found in `package.json` and are automatically installed
with Synthea (see below).

## Installation

***Synthea*** can be built into a native application for Mac OS, Windows, and Linux, and when ready
those distributions will be linked to here. For now, you may clone this repo and run locally
or create your own builds.


**Developer Installation**

```
$ git clone https://github.com/avanwinkle/synthea.git
$ cd synthea
$ npm install
$ npm start
```


**Build Instructions**

Builds will be created in the `dist/` folder of the repo. Currently a build configuration is only available for Mac OSX, which can be run using the following command (inside the synthea repo directory):

```$ npm run build```

For instructions to build for other systems, see the help output by running:

```$ electron-packager --help```

## Projects

For getting to know Synthea, there are a variety of sample projects available to stream. These
projects can be accessed in the menu at **Projects > Browse Cloud Projects...**.

_Please note that when streaming projects from the cloud, loops may not be gapless._

An in-progress feature is an internal project creator/editor, and it works pretty
well but has a ways to go. You can create a project by making a new folder in the projects folder, whach can be accessed by the menu **Projects > Go to Projects Folder** (by default, %APPLICATION DATA%/Synthea/Projects). The projects folder can be changed via the menu **Projects > Change Projects Folder...**.

A project is defined by a JSON-formatted `layout.json` file, an optional banner image file, and an `/audio` subfolder containing the cue files (accepting OGG, MP3, WAV, and other major formats).

_TODO: Use [asar](https://www.npmjs.com/package/asar) to package each project folder into a single archive file with a unique extension, e.g. myProject.synpkg_

#### Project Folder Layout
```
myProject
  | - layout.json
  | - my_project_banner.jpg
  | - audio /
  |      - soundfile.wav
  |      - musicfile.mp3
```

#### Sample Layout File

```javascript
{
    "name": "My Synthea Project",
    "bannerImage": "banner.jpg",         // Optional image
    "config": {
        "boardType": "music",            // Optional, default subgroup for cues
        "fadeInDuration": 1000,          // Default fade-in for cues (ms)
        "fadeOutDuration": 2000          // Default fade-out for cues (ms)
    },
    "pages": [
        {
            "display_order": 0,          // The order of pages/sections/cues is user-configurable
            "id": 1,                     // All pages, sections, and cues should have unique ids
            "name": "First Tab"
        }
    ],
    "sections": [
        {
            "display_order": 0,
            "id": 100,
            "name": "First Column",
            "page_id": 1                 // A column exists only on a given page, tracked by id
        }
    ],
    "cues": [
        {
            "section_ids": [ 1, 4 ],     // A cue can appear in multiple sections, even pages
            "sources": ["soundf.wav"],   // A cue can have multiple source files
            "id": 1000,
            "isLoop": true,              // Looping can be toggled in-app, but cues can be preset
            "name": "Basic Effect",
        },
        {
            "section_ids": [ 1 ],
            "sources": ["music.mp3"],
            "subgroup": "music",            // The subgroup name for this cue
            "id": 1001,
            "isFadeIn": false,           // Override the project's fade settings
            "isLoop": false,
            "name": "Music Song"
        }
    ],
    "hotKeys": {
        "KeyA": {                        // The key event codename
            "action": "PLAY",            // A soundboard action
            "target": 1001               // Id of the cue to target
        },
        "Ctrl.Shift.KeyB": {             // Modifier keys are supported
            "action": "PLAY",
            "target": 1000
        }
    },
    "subgroups": {                       // Specific options for any subgroup
        "rain": {                        // Subgroups here are optional
            "isFadeIn": true             // Subgroup fades override project fades
        }
    }
}
```


## Credits

Synthea (Current)<br/>
&copy; 2016 Anthony van Winkle

Original Synthea<br/>&copy; 2011-2015 Anthony van Winkle<br/>with contributions by Dan Posluns and Tim Harahan
