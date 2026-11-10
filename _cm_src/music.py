# 納まりナビCM（30秒）の音楽と効果音を、計算だけで作る（素材の借り物なし）
import numpy as np, wave
SR=44100; DUR=30.0; N=int(SR*DUR)
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def add(sig,t,gain=1.0,pan=0.0):
    i=int(t*SR); n=min(len(sig),N-i)
    if n<=0: return
    L[i:i+n]+=sig[:n]*gain*(1-max(0,pan)); R[i:i+n]+=sig[:n]*gain*(1+min(0,pan))
def env(n,a,d):  # 立ち上がり a 秒・減衰 d 秒
    t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/d)
def lp(x,fc):
    a=np.exp(-2*np.pi*fc/SR); y=np.empty_like(x); s=0.0
    for i,v in enumerate(x): s=(1-a)*v+a*s; y[i]=s
    return y
def hz(m): return 440*2**((m-69)/12)
def pluck(m,dur=0.35):
    n=int(dur*SR); t=np.arange(n)/SR; f=hz(m)
    s=sum(np.sin(2*np.pi*f*k*t)/k for k in (1,2,3,4,5))
    return s*env(n,0.004,dur/3.2)*0.22
def pad(ms,dur):
    n=int(dur*SR); t=np.arange(n)/SR; s=np.zeros(n)
    for m in ms:
        for dt in (-0.25,0.25): s+=np.sin(2*np.pi*(hz(m)+dt)*t)+0.3*np.sin(2*np.pi*2*(hz(m)+dt)*t)
    e=np.minimum(1,t/0.08)*np.minimum(1,(dur-t)/0.25)
    return s*e*0.035
def bass(m,dur=0.24):
    n=int(dur*SR); t=np.arange(n)/SR; f=hz(m)
    return (np.sin(2*np.pi*f*t)+0.35*np.sin(2*np.pi*2*f*t))*env(n,0.005,dur/2.2)*0.5
def kick():
    n=int(0.28*SR); t=np.arange(n)/SR; f=48+110*np.exp(-t/0.035)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.10)*0.95
def hat(d=0.03):
    n=int(0.09*SR); x=rng.standard_normal(n); x=x-lp(x,7000)
    return x*np.exp(-np.arange(n)/SR/d)*0.16
def clap():
    n=int(0.2*SR); x=rng.standard_normal(n); x=lp(x,5000)-lp(x,900)
    return x*np.exp(-np.arange(n)/SR/0.05)*0.55
def whoosh(dur=0.7):
    n=int(dur*SR); x=rng.standard_normal(n); t=np.arange(n)/SR
    y=lp(x,2500)-lp(x,500); return y*np.sin(np.pi*t/dur)**2*0.5
def pop(m=84):
    n=int(0.12*SR); t=np.arange(n)/SR; f=hz(m)*(1+0.6*np.exp(-t/0.02))
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.03)*0.4
def impact():
    n=int(1.6*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*np.cumsum(40+60*np.exp(-t/0.08))/SR)*np.exp(-t/0.45)+lp(rng.standard_normal(n),3000)*np.exp(-t/0.25)*0.5)*0.8

# ① 0〜5秒：低い持続音＋時計のような刻み（悩み）
n=int(5*SR); t=np.arange(n)/SR
dr=(np.sin(2*np.pi*55*t)+0.6*np.sin(2*np.pi*82.4*t)+0.4*np.sin(2*np.pi*110.5*t))*np.minimum(1,t/0.5)*0.16
add(dr,0)
for i in range(10): add(hat(0.012),i*0.5,0.9,0.3 if i%2 else -0.3)
for tt in (0.9,1.9,2.6,3.3): add(pop(72 if tt<1 else 79),tt,0.9)
# 5秒へ向けて上がっていく音
n=int(1.0*SR); t=np.arange(n)/SR
ris=(lp(rng.standard_normal(n),6000)-lp(rng.standard_normal(n),800))*(t/1.0)**2*0.45
add(ris,4.0)

# ② 5秒〜：明るい曲（120拍／分。和音は2秒ごと）
BEAT=0.5
chords=[(53,[65,69,72]),(55,[67,71,74]),(57,[69,72,76]),(48,[64,67,72])]  # F G Am C
add(impact(),5.0,1.0)
for bar in range(12):
    t0=5.0+bar*2.0; root,ch=chords[bar%4]
    if bar==11: root,ch=48,[64,67,72,76]
    add(pad(ch,2.0 if bar<11 else 3.2),t0,1.0)
    if bar==11:
        for k,m in enumerate([72,76,79,84]): add(pluck(m,1.6),t0+k*0.06,1.1)
        add(kick(),t0); add(bass(36,1.2),t0,0.9); break
    quiet = bar==0  # ロゴの場面は打楽器を控えめ
    for b in range(4):
        tb=t0+b*BEAT
        add(kick(),tb,0.55 if quiet else 1.0)
        if not quiet:
            add(hat(),tb+0.25,1.0,0.25)
            if b%2==1: add(clap(),tb,0.5)
        add(bass(root-12 if root>50 else root,0.24),tb,0.8); add(bass(root if root<=50 else root-12,0.2),tb+0.25,0.55)
    arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12,ch[2]+12,ch[0]+24,ch[2]+12,ch[1]+12]
    for k,m in enumerate(arp): add(pluck(m),t0+k*0.25,0.9,(-0.4 if k%2 else 0.4))
# 場面がえの風切り音・数量の札の音
for w in (5,7.5,14,20,25): add(whoosh(),w-0.38,0.8)
for tt,m in ((16.3,84),(16.8,86),(17.1,88),(26.6,91)): add(pop(m),tt,0.8)

# 仕上げ：終わりを絞る・音量をそろえる
fade=np.ones(N); k=int(1.2*SR); fade[-k:]=np.linspace(1,0,k)**1.5
L*=fade; R*=fade
pk=max(np.abs(L).max(),np.abs(R).max()); g=0.89/pk
st=np.stack([np.tanh(L*g*1.15)/np.tanh(1.15)*0.89,np.tanh(R*g*1.15)/np.tanh(1.15)*0.89],1)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
print('music.wav', N/SR, 'sec', 'peak', float(np.abs(st).max()))
