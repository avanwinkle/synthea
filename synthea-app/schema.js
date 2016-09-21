(function() {

var cueSchema = {
    "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "isFadeIn": {
            "type": "boolean"
          },
          "isLoop": {
            "type": "boolean"
          },
          "loopFile": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "subgroup": {
            "type": ["null", "string"]
          },
          "tooltip": {
            "type": "string"
          },
          "volume": {
            "type": "float"
          }
        },
        "required": [
          "id",
          "name",
          "sources"
        ],
        "additionalProperties": false
};

var pageSchema = {
    "type": "object",
    "properties": {
      "display_order": {
        "type": "integer"
      },
      "id": {
        "type": "integer"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "display_order",
      "id",
      "name"
    ],
    "additionalProperties": false
};

var projectSchema = {
  "type": "object",
  "properties": {
    "bannerImage": {
        "type": "string"
    },
    "config": {
      "type": "object",
      "properties": {
        "boardType": {
          "type": "string"
        },
        "fadeInDuration": {
          "type": "integer"
        },
        "fadeOutDuration": {
          "type": "integer"
        }
      },
      "required": []
    },
    "cues": {
      "type": "array",
      "items": {
        "$ref": "/synCue"
      }
    },
    "hotKeys": {
      "type": "object",
      "properties": {},
      "additionalProperties": {
        "type": "object",
        "properties": {
            "accelAlt": {
                "type": "boolean"
            },
            "accelCtrl": {
                "type": "boolean"
            },
            "action": {
                "type": "string"
            },
            "cue_id": {
                "type": "integer"
            }
        },
        "required": ["action","cue_id"]
      }
    },
    "key": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "pages": {
      "type": "array",
      "items": {
        "$ref": "/synPage"
      }
    },
    "sections": {
      "type": "array",
      "items": {
        "$ref": "/synSection"
      }
    },
    "subgroups": {
        "type": "object"
    }
  },
  "required": [
    "config",
    "cues",
    "hotKeys",
    "key",
    "name",
    "pages",
    "sections"
  ],
  "additionalProperties": false
};

var sectionSchema = {
    "type": "object",
    "properties": {
      "cue_ids": {
        "type": "array",
        "items": {
          "type": "integer"
        }
      },
      "display_order": {
        "type": "integer"
      },
      "id": {
        "type": "integer"
      },
      "name": {
        "type": "string"
      },
      "page_id": {
        "type": "integer"
      }
    },
    "required": [
      "cue_ids",
      "display_order",
      "id",
      "name",
      "page_id"
    ],
    "additionalProperties": false
};

module.exports = {
    cueSchema: cueSchema,
    pageSchema: pageSchema,
    projectSchema: projectSchema,
    sectionSchema: sectionSchema
};


// IIFE
})();