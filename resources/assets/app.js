(() => {
  'use strict';
  const data = window.DEMO_DATA; if (!data?.items?.length) return;
  const $ = id => document.getElementById(id), overview=data.items[0], comparisons=data.items.slice(1);
  const demo=$('demo-player'), player=$('player'), strip=$('cards');
  const captionState=new Map([[demo,{enabled:false,url:null}],[player,{enabled:false,url:null}]]);
  let current=comparisons[0], filter='all';
  const duration=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  const vttTime=t=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
  function play(video,status){const promise=video.play();if(promise)promise.catch(()=>{$(status).textContent='Press the play button to start the video.';});}
  function captions(video,item){
    const state=captionState.get(video);video.querySelectorAll('track').forEach(t=>t.remove());if(state.url)URL.revokeObjectURL(state.url);
    const content='WEBVTT\n\n'+item.captions.map((c,i)=>`${i+1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`).join('\n');
    state.url=URL.createObjectURL(new Blob([content],{type:'text/vtt'}));
    const track=document.createElement('track');track.kind='captions';track.label='English narration';track.srclang='en';track.src=state.url;video.appendChild(track);
    track.track.mode=state.enabled?'showing':'hidden';track.addEventListener('load',()=>{track.track.mode=state.enabled?'showing':'hidden';});
  }
  function setupCaptions(video,button){$(button).addEventListener('click',()=>{const state=captionState.get(video);state.enabled=!state.enabled;$(button).setAttribute('aria-pressed',String(state.enabled));for(const track of video.textTracks)track.mode=state.enabled?'showing':'hidden';});}
  function makeSequence(video,list,entries,status,prompts=false){
    list.replaceChildren();entries.forEach((entry,i)=>{
      const button=document.createElement('button');button.type='button';button.className='sequence-item';button.dataset.time=entry.time;button.dataset.end=entry.end;
      if(entry.original)button.title=entry.original;
      const time=document.createElement('span');time.className='time';time.textContent=prompts?String(i+1).padStart(2,'0'):duration(entry.time);
      const label=document.createElement('span');label.textContent=entry.label;button.append(time,label);button.addEventListener('click',()=>{video.currentTime=entry.time;play(video,status);});list.appendChild(button);
    });
  }
  function toggle(button,panel){$(button).addEventListener('click',()=>{const open=$(panel).hidden;$(panel).hidden=!open;$(button).setAttribute('aria-expanded',String(open));});}
  function keepVisible(card){
    const a=card.getBoundingClientRect(),b=strip.getBoundingClientRect();
    if(a.left<b.left+3)strip.scrollBy({left:a.left-b.left-3,behavior:'smooth'});
    else if(a.right>b.right-3)strip.scrollBy({left:a.right-b.right+3,behavior:'smooth'});
  }
  function select(id,{autoplay=true,reveal=true}={}){
    const item=comparisons.find(i=>i.id===id);if(!item)return;
    current=item;player.pause();$('status').textContent='';player.poster=item.poster;player.src=item.media;
    $('current-category').textContent=item.category.toUpperCase();$('current-title').textContent=item.title;$('current-description').textContent=item.summary;
    $('current-duration').textContent=duration(item.duration);$('selection-position').textContent=`${comparisons.indexOf(item)+1} / ${comparisons.length}`;
    $('comparison-panel').setAttribute('aria-labelledby','tab-'+id);$('download-video').href=item.media;$('download-video').download=item.id+'.mp4';
    document.querySelectorAll('.case-card').forEach(card=>{const active=card.dataset.id===id;card.classList.toggle('current',active);card.setAttribute('aria-selected',String(active));card.tabIndex=active?0:-1;});
    $('sequence').hidden=true;$('sequence-button').setAttribute('aria-expanded','false');
    const prompts=Boolean(item.prompt_summaries);$('sequence-button').textContent=prompts?`Instructions (${item.prompt_summaries.length})`:'Chapters';
    $('sequence-hint').textContent=prompts?'Click an instruction to seek to its segment. Hover to read the original prompt.':'Click a chapter to jump to that moment.';
    const entries=prompts?item.prompt_summaries.map((label,i)=>({label,time:item.caption_intervals[i][0],end:item.caption_intervals[i][1],original:item.original_prompts[i]})):item.chapters.map((c,i)=>({...c,end:item.chapters[i+1]?.time??item.duration}));
    makeSequence(player,$('sequence-list'),entries,'status',prompts);player.load();captions(player,item);
    if(autoplay)play(player,'status');
    if(reveal)keepVisible($('tab-'+id));
  }
  comparisons.forEach(item=>{
    const card=document.createElement('button');card.type='button';card.className='case-card';card.dataset.id=item.id;card.dataset.category=item.category;card.id='tab-'+item.id;card.setAttribute('role','tab');card.setAttribute('aria-controls','comparison-panel');card.setAttribute('aria-selected','false');card.setAttribute('aria-label',`${item.title}, ${duration(item.duration)}`);card.tabIndex=-1;
    const thumb=document.createElement('div');thumb.className='thumb';const img=document.createElement('img');img.src=item.poster;img.alt='';img.draggable=false;img.width=960;img.height=540;
    const length=document.createElement('span');length.className='clip-duration';length.textContent=duration(item.duration);const selected=document.createElement('span');selected.className='selected-label';selected.textContent='SELECTED';thumb.append(img,length,selected);
    const body=document.createElement('div');body.className='card-body';const category=document.createElement('p');category.className='card-category';category.textContent=item.category;const title=document.createElement('p');title.className='card-title';title.textContent=item.title;body.append(category,title);card.append(thumb,body);card.addEventListener('click',()=>select(item.id));strip.appendChild(card);
  });
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
    let count=0;document.querySelectorAll('.case-card').forEach(card=>{card.hidden=filter!=='all'&&card.dataset.category!==filter;if(!card.hidden)count++;});
    $('result-count').textContent=filter==='all'?'1 main comparison · 8 examples':`${count} examples`;
    const first=comparisons.find(i=>filter==='all'||i.category===filter);if(current.id!==first.id)select(first.id,{autoplay:false,reveal:false});
    strip.scrollLeft=0;requestAnimationFrame(updateArrows);
  }));
  function updateArrows(){const max=strip.scrollWidth-strip.clientWidth;$('scroll-left').disabled=strip.scrollLeft<=2;$('scroll-right').disabled=strip.scrollLeft>=max-2;}
  $('scroll-left').addEventListener('click',()=>strip.scrollBy({left:-strip.clientWidth*.75,behavior:'smooth'}));$('scroll-right').addEventListener('click',()=>strip.scrollBy({left:strip.clientWidth*.75,behavior:'smooth'}));
  strip.addEventListener('scroll',updateArrows,{passive:true});window.addEventListener('resize',updateArrows);
  // Native touch/trackpad scrolling plus mouse drag; dragging must not accidentally select a clip.
  let drag=null,suppressClick=false;
  strip.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;suppressClick=false;drag={id:e.pointerId,x:e.clientX,left:strip.scrollLeft,moved:false};});
  strip.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(!drag.moved&&Math.abs(dx)>6){drag.moved=true;strip.setPointerCapture(e.pointerId);strip.classList.add('dragging');}if(drag.moved){e.preventDefault();strip.scrollLeft=drag.left-dx;}});
  function finishDrag(e){if(!drag||drag.id!==e.pointerId)return;suppressClick=drag.moved;drag=null;strip.classList.remove('dragging');if(strip.hasPointerCapture(e.pointerId))strip.releasePointerCapture(e.pointerId);setTimeout(()=>{suppressClick=false;},0);}
  strip.addEventListener('pointerup',finishDrag);strip.addEventListener('pointercancel',finishDrag);strip.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
  strip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const cards=[...strip.querySelectorAll('.case-card:not([hidden])')];let i=cards.indexOf(document.activeElement);if(i<0)return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?cards.length-1:Math.max(0,Math.min(cards.length-1,i+(e.key==='ArrowRight'?1:-1)));cards[i].focus({preventScroll:true});select(cards[i].dataset.id,{autoplay:false});});
  toggle('sequence-button','sequence');toggle('demo-chapters-button','demo-chapters');setupCaptions(player,'captions-button');setupCaptions(demo,'demo-captions-button');
  demo.src=overview.media;demo.load();captions(demo,overview);makeSequence(demo,$('demo-chapters-list'),overview.chapters.map((c,i)=>({...c,end:overview.chapters[i+1]?.time??overview.duration})),'demo-status');
  for(const [video,other,status,list] of [[demo,player,'demo-status','demo-chapters-list'],[player,demo,'status','sequence-list']]){
    video.addEventListener('play',()=>other.pause());video.addEventListener('playing',()=>{$(status).textContent='';});video.addEventListener('error',()=>{$(status).textContent='The video could not be loaded. Try reloading the page, or use the download link to open the MP4 directly.';});
    video.addEventListener('timeupdate',()=>{$(list).querySelectorAll('.sequence-item').forEach(b=>b.classList.toggle('active',video.currentTime>=Number(b.dataset.time)&&video.currentTime<Number(b.dataset.end)));});
  }
  select(comparisons[0].id,{autoplay:false,reveal:false});requestAnimationFrame(updateArrows);
})();
