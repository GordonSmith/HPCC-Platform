NLP Plugin
================

This plugin exposes nlp-engine to ECL.  It is a wrapper around VisualText's nlp-engine:
* [GitHub](https://github.com/VisualText/nlp-engine)


Installation and Dependencies
------------------------------

The nlp plugin has a dependency on https://github.com/VisualText/nlp-engine which has been added to the HPCC-Platform repository as a git submodule.  To install:
```c
git submodule update --init --recursive
```

Quick Start
------------

Import the nlp plugin library and calculate a NLP index at the specified lat/long and at maximum resolution (15):
```c
IMPORT nlp from lib_nlp; 

nlp_index := nlp.index(40.689167, -74.044444, 15);
```

API
----

### Type Declarations
```c
```

### Inspection functions

#### toString

```c
STRING toString(CONST nlp_index_t idx)
```

Converts the NLPIndex representation of `idx` to the string representation.

#### fromString

```c
nlp_index_t fromString(CONST VARSTRING strIdx) : cpp,action,context,fold,entrypoint='fromString';
```

Converts the string representation of `strIdx` to the NLPIndex representation.

Returns 0 on error.

