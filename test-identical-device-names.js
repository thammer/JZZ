var JZZ = require('.');

let inputs = [];

async function onConnectDisconnet(changes)
{
  console.log("Changed devices:")
  console.log("  Added inputs:");
  changes.inputs.added.forEach( (info) => {
    console.log("    " + info.name);
  });
  if (changes.inputs.added. length == 0)
    console.log("    (none)");

  console.log("  Removed inputs:");
  changes.inputs.removed.forEach( (info) => {
    console.log("    " + info.name);
  });
  if (changes.inputs.removed. length == 0)
    console.log("    (none)");

  console.log("  Added outputs:");
  changes.outputs.added.forEach( (info) => {
    console.log("    " + info.name);
  });
  if (changes.outputs.added. length == 0)
  console.log("    (none)");

  console.log("  Removed outputs:");
  changes.outputs.removed.forEach( (info) => {
    console.log("    " + info.name);
  });
  if (changes.outputs.removed. length == 0)
    console.log("    (none)");

  console.log("Closing all inputs");
  inputs.forEach( (input) => {
    input.close();
  });  

  // The line below causes an infinite recursion loop, through _refresh and _postRefresh
  // listenForMIDIInput(this);
  
  await flashZoomDevices(this);
  await sendMIDIIdentityRequests(this);
}

function sleep(timeoutMilliseconds)
{
  return new Promise( (resolve) => {
    setTimeout(() =>
    {
      resolve("Timed out");
    }, timeoutMilliseconds);
  });
}

async function sendMIDIIdentityRequests(midi, delayMilliSeconds = 300)
{
  console.log(`Sending MIDI identity requests`);
  for(let i=0; i<midi.info().outputs.length; i++)
  {
    let info = midi.info().outputs[i];
    let output = midi.openMidiOut(i);
    console.log(`  Sending MIDI identity request to device ${i}: ${info.name}`)
    output.send(0xf0,0x7e,0x00,0x06,0x01,0xf7);
    output.close();
    await sleep(delayMilliSeconds);
  }
}

async function flashZoomDevices(midi, delayMilliSeconds = 300)
{
  console.log(`Flashing tuners on Zoom devices`);
  await sleep(delayMilliSeconds);
  let deviceCounter = 1;
  for(let i=0; i<midi.info().outputs.length; i++)
  {
    let info = midi.info().outputs[i];
    if (info.name.includes("ZOOM MS Series"))
    {
      let output = midi.openMidiOut(i);
      console.log(`  Flashing tuner on MIDI device ${i + 1}, Zoom device ${deviceCounter}: ${output.name()}`)
      for (let j=0; j<deviceCounter; j++) 
      {
        output.send(0xB0, 74, 127);
        await sleep(delayMilliSeconds);
        output.send(0xB0, 74, 0);
        await sleep(delayMilliSeconds);
      }
      output.close();
      deviceCounter++;
    }
    await sleep(delayMilliSeconds);
  };
}

function listenForMIDIInput(midi)
{
  console.log(`Listening for MIDI input`);
  inputs = [];
  for(let i=0; i<midi.info().inputs.length; i++)
  {
    let info = midi.info().inputs[i];
    let input = midi.openMidiIn(i);
    inputs.push(input);
    console.log(`  Listening for incoming MIDI messages from device ${i}: ${info.name}`);
    input.connect(function(msg) {
      console.log(`  Received MIDI message from device ${i} "${info.name}": ${msg.toString()}`);
    });
  }
}

JZZ().or('Cannot start MIDI engine!').and(async function(){
  console.log("Inputs:")
  for(let i=0; i<this.info().inputs.length; i++)
  {
    let info = this.info().inputs[i];
    console.log("  " + i + ": " + info.name);
  }

  console.log("Outputs:")
  for(let i=0; i<this.info().outputs.length; i++)
  {
    let info = this.info().outputs[i];
    console.log("  " + i + ": " + info.name);
  }

  listenForMIDIInput(this);

  await sendMIDIIdentityRequests(this);

  await flashZoomDevices(this);


}).onChange(onConnectDisconnet);