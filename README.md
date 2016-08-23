SYNTHEA Soundboard
==============

Short for SYNthetic THEater Audio, Synthea is a customizable soundboard program designed for dynamic playback of
dialogue, sound effects, and music in unscripted environments. It was written for use in improvised theater, but
is suitable in any live performance where pre-programmed cues are not sufficient.

Synthea is an Electron-based Angular-powerd program that generates a tabbed software soundboard for realtime playback of dialogue,
sound effects, and music. Playback options include simultaneous, sequential, and crossfade; cues can be looped or
randomized; hotkeys can be bound, and much more. Key features include:

 - Distinct Playback Behaviors for Dialogue, Sound Effects, and Music Modes
 - "Lock" Toggle to Build Cue List and Delay Playback Until Unlock
 - Intuitive Tab-Based Interface to Store Hundreds of Unique Cues
 - Multiple Variations of a Cue Playable Randomly from a Single Cue Button
 - Board Variations Toggled On-The-Fly for Multiple Board Identities
 - Programmable Hot-Keys for Instant Access to Common Cues
 - Modifier Key Support for Easy Hot-Key Iterations
 - Segmentable Intro, Outro, and Loop Parameters for Gapless Looping

Synthea was originally written in Python with wxPython, PyGame, and VLC. It is
now being actively ported (here in this repo!) to a web application wrapped by
Electron.


How Synthea Works
=============

Synthea uses project subfolders to offer a list of projects. Each project folder contains configuration files and audio files as described below:

Each project folder has a Config file that defines its name, type (dialog, sound effects, or music), and its optional playback modes. The types are distinguished by the following characteristics:

     DIALOG: Concurrent cues are queued and played back sequentially
     EFFECTS: Concurrent cues are played simultaneously
     MUSIC: New cues fade in as the previous cue is faded out

Additionally, each project configuration file can declare multiple 'modes', which are subdirectories that contain mirrors of all the cue files. These modes allow on-the-fly switching between audio sets while maintaining the project's board layout.

Each project folder also contains a Layout file, which is a delimited text file that defines the hierarchy of pages,
groups, effects buttons, and cue files for that soundboard. Multiple cue files can be assigned to the same button;
in such cases, a random file will be selected each time the button is queued. Buttons can include the following options:

     NOCACHE: The sound file is not cached in RAM until the button is queued
     BUFFER: The sound file is never cached in RAM, only streamed through
     LOOP: The sound file will playback indefinitely in a seamless loop
     LOOPEXT: The sound file will play and seamlessly begin looping another file

Finally, each project has an optional Hotkeys file, where global keyboard events can be programmed. These events will override the built-in hotkeys, and are a simple delimited list of keyboard event codes (triggers) and effect button names (actions).

Why Synthea Exists
===============
In unscripted theater, a sound board operator needs access to effects and music in ways that
scripted theater software cannot accomodate.

As a tech improviser, I once needed the ability to provide realtime, unscripted conversation
between performers onstage and an artificial intelligence controlled in the booth, and so SYNTHEA was
created as means to seamlessly queue up a wide selection of pre-recorded sentence fragments and play them
back sequentially on demand.

SYNTHEA has since expanded to provide customized music and sound effects boards for numerous other
unscripted plays and improv performances, and continues to be developed for better and broader functionality.
It is still in its infancy, but for those willing and able to learn it, I hope it proves a useful tool.

For more information visit www.synthea.org

Installation
========

Installation instructions to follow after full Electron migration

(C) 2011-2013 Anthony van Winkle with contributions by Dan Posluns
