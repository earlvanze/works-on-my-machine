# Works On My Machine

A programmatic music video. No one knows your machine quite like your agent does, not even you. Any number of
reasons could be why your copy of the app refuses to run: a stale PATH, three Pythons, a 2019 dotfile, a zombie on
port 3000, an old glibc. So before you open the same ticket again:

> **Point your agent at the repo, the issues, and the PRs. Search before you post. Scroll up a little bit.**

See [`AGENTS.md`](AGENTS.md) for the exact checklist agents should follow here.

## What's in here
| path | what |
|---|---|
| `suno/works-on-my-machine.md` | song sheet: title, style prompt, lyrics |
| `audio/works-on-my-machine-suno-analog.flac` | lossless capture of the selected Suno take ([source](https://suno.com/song/34c8a402-f553-44a6-93de-55ccc97e49c7)), with `works-on-my-machine-provenance.json` (trim, duration, SHA-256, verification notes) |
| `kinetic/` | the video: a kinetic-typography renderer (three.js + Canvas2D in headless Chromium) driven by word timing |
| `kinetic/lyrics.txt`, `kinetic/data/` | lyrics as sung, word timing (`lyrics.json`) and beat/envelope analysis (`audio.json`) |
| `kinetic/app/src/project/` | this video's palette, brand, edit (`script.ts`) and bespoke shots (`shots.ts`) |

## How it was made
1. Song written for the topic and generated in Suno (v6-mini); two takes, take 1 selected.
2. Captured from normal browser playback through an isolated PipeWire null sink (48 kHz / 24-bit), trimmed to the
   player-reported duration, verified, and recorded in the provenance JSON.
3. Timing: Demucs vocal stem → whisper.cpp cues → MMS forced alignment per line → beat analysis.
4. Every lyric line is a shot: a certification stamp, an `agent doctor` log, a dotfile that keeps a secret, my
   machine vs yours, an agent scanning the box, the repo's Code/Issues/PRs tabs, a "New issue: broke" form with
   older issues scrolling in above it, a pile of DUPLICATE tickets, and an end card.

## Render it yourself
Requirements: Linux, Chromium, ffmpeg, bun, uv, whisper.cpp + a GGML model.
```sh
cd kinetic
(cd app && bun install) && (cd analysis && uv sync)
ffmpeg -i ../audio/works-on-my-machine-suno-analog.flac -c:a pcm_s24le ../audio/master.wav
WHISPER_MODEL=~/models/ggml-medium.en.bin ./swap-audio.sh ../audio/master.wav
./review.sh v1            # fast 960x540 review
./render-full.sh works-on-my-machine.mp4   # 1080p with motion blur + QA
```
It doesn't work on your machine? You know what to do.

## License
Code: MIT (`kinetic/LICENSE`; renderer engine `kinetic/LICENSE-pdoom-engine`). Fonts: SIL OFL. Song and lyrics:
© earlco, generated with Suno.
