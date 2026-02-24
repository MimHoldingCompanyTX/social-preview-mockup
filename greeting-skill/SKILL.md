---
name: greeting-skill
description: Says "hi" to the user upon invocation.
metadata:
  {
    "openclaw":
      {
        "emoji": "👋",
        "requires": { "bins": [] },
        "install": []
      }
  }
---

# Greeting Skill

This skill simply outputs a greeting.

## Execution Instructions

To run this skill:
```bash
./greeting-skill/run.sh
```

## Internal Logic Script (`run.sh`)

```bash
#!/bin/bash
echo "hi"
```
