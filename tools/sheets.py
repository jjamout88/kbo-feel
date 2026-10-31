import sys,glob,os
from PIL import Image
G=sys.argv[1]
fs=sorted(f for f in glob.glob(G+'/*.png') if not os.path.basename(f).startswith('sheet'))
for k in range(0,len(fs),4):
    im=Image.new('RGB',(844*2+10,390*2+10),(255,255,255))
    for i,f in enumerate(fs[k:k+4]): im.paste(Image.open(f).convert('RGB'),((i%2)*854,(i//2)*400))
    im.save(f'{G}/sheet{k//4}.png')
print(len(fs))
