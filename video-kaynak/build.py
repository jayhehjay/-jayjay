# Sahne karelerini yumuşak geçişli MP4'e çevirir (WhatsApp uyumlu H.264)
import json, subprocess, sys, imageio_ffmpeg
d = sys.argv[1]; out = sys.argv[2]
sc = json.load(open(f"{d}/scenes.json"))
ff = imageio_ffmpeg.get_ffmpeg_exe()
X = 0.3
args = [ff, '-y', '-loglevel', 'error']
for s in sc:
    args += ['-loop', '1', '-t', f"{s['dur'] + X:.2f}", '-framerate', '30', '-i', s['file']]
chain, prev, off = [], '[0:v]', 0.0
for i in range(1, len(sc)):
    off += sc[i - 1]['dur']
    lbl = f'[v{i}]'
    chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={X}:offset={off:.2f}{lbl}")
    prev = lbl
chain.append(f"{prev}format=yuv420p,scale=780:1688[out]")
args += ['-filter_complex', ';'.join(chain), '-map', '[out]', '-r', '30',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-movflags', '+faststart', out]
subprocess.run(args, check=True)
print(out)
