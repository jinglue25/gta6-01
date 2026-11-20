// Small persistent synthesizer: all sound is generated locally after a gesture.
export class AudioSystem {
  constructor(){this.context=null;this.muted=false;}
  start(){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio)return;
    if(this.context){this.context.resume().catch(()=>{});return;}
    try {
      const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=this.muted?0:.22;this.master.connect(c.destination);
      const continuous=(frequency,type,gain)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=frequency;g.gain.value=gain;o.connect(g);g.connect(this.master);o.start();return {o,g};};
      this.engine=continuous(45,'sawtooth',0);this.siren=continuous(620,'sine',0);
      this.pad=[continuous(130.81,'sine',.035),continuous(164.81,'sine',.025),continuous(196,'sine',.022)];
    }catch{this.context=null;}
  }
  toggle(){this.muted=!this.muted;if(this.context)this.master.gain.setTargetAtTime(this.muted?0:.22,this.context.currentTime,.04);return this.muted;}
  tone(frequency,duration=.12,type='sine',volume=.3,delay=0){
    if(!this.context)return;const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(frequency,t);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  click(){this.tone(420,.06,'triangle',.2);}
  cash(){this.tone(1300,.12);this.tone(1800,.2,'sine',.2,.1);}
  complete(){[523,659,784,1047].forEach((f,i)=>this.tone(f,.3,'triangle',.25,i*.12));}
  gunshot(){
    this.tone(90,.12,'sawtooth',.65);
    if(!this.context)return;const c=this.context,b=c.createBuffer(1,Math.floor(c.sampleRate*.13),c.sampleRate),data=b.getChannelData(0);
    // A deterministic noise burst avoids asset loading.
    let v=1729;for(let i=0;i<data.length;i++){v=(Math.imul(v,1664525)+1013904223)>>>0;data[i]=(v/2147483648-1)*(1-i/data.length);}
    const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=.4;s.connect(g);g.connect(this.master);s.start();s.onended=()=>{s.disconnect();g.disconnect();};
  }
  update(speed,distance,wanted,active,time){
    if(!this.context)return;const t=this.context.currentTime;
    this.engine.o.frequency.setTargetAtTime(42+Math.abs(speed)*5,t,.08);this.engine.g.gain.setTargetAtTime(active&&speed!==null?.065:0,t,.15);
    this.siren.o.frequency.setTargetAtTime(Math.floor(time*2)%2?850:590,t,.035);
    this.siren.g.gain.setTargetAtTime(active&&wanted?Math.max(0,1-distance/100)*.17:0,t,.2);
    this.pad.forEach((p,i)=>p.g.gain.setTargetAtTime(active?.018+Math.sin(time*.13+i)*.006:.01,t,1));
  }
}
