var JZZ = require('.');

let inputs = [];

function addDeviceNamesToSet(set, changes)
{
  changes.forEach( (info) => {
    set.add(info.deviceName)
  });
}

async function onConnectDisconnect(changes)
{
  let s = "";
  console.log("Device changes detected:")

  if (changes.inputs.added.length > 0)
  {
    changes.inputs.added.forEach( (info) => s += s.length != 0 ? ", " : "" + info.name );  
    console.log("  Added inputs: " + s);
  }

  if (changes.inputs.removed.length > 0)
  {
    changes.inputs.removed.forEach( (info) => s += s.length != 0 ? ", " : "" + info.name );  
    console.log("  Removed inputs: " + s);
  }

  if (changes.outputs.added.length > 0)
  {
    changes.outputs.added.forEach( (info) => s += s.length != 0 ? ", " : "" + info.name );  
    console.log("  Added outputs: " + s);
  }

  if (changes.outputs.removed.length > 0)
  {
    changes.outputs.removed.forEach( (info) => s += s.length != 0 ? ", " : "" + info.name );  
    console.log("  Removed outputs: " + s);
  }

  let inputNames = new Set();
  let outputNames = new Set();
  addDeviceNamesToSet(inputNames, changes.inputs.added);
  addDeviceNamesToSet(inputNames, changes.inputs.removed);
  addDeviceNamesToSet(outputNames, changes.outputs.added);
  addDeviceNamesToSet(outputNames, changes.outputs.removed);

  // Close all devices (except the removed device) with same deviceName as an added or removed device
  // We need to close all devices before we re-open them again, because device names and device indexes 
  // might have changed. This sometimes happens when you have multiple devices with the same name on the 
  // Windows platform using the Windows Multimedia API).
  for (let i=0; i<inputs.length; i++)
  {
    let input = inputs[i];
    let inputName = input.info().name;
    if ( inputNames.has(input.info().deviceName) && (changes.inputs.removed.findIndex((info) => info.name === inputName) === -1) )
    {
      console.log(`  Closing device ${inputName} because it has the same deviceName as an added or removed device`);
      input.close();
    }
  }

  // Re-open all devices (except the removed device) with same deviceName as an added or removed device
  for (let i=0; i<inputs.length; i++)
  {
    let input = inputs[i];
    let inputName = input.info().name;
    if ( inputNames.has(input.info().deviceName) && (changes.inputs.removed.findIndex((info) => info.name === inputName) === -1) )
    {
      console.log(`  Re-opening device ${inputName} because it has the same deviceName as an added or removed device`);
      input = this.openMidiIn(inputName);;
      inputs[i] = input;
      addInputListener(input);
    }
  }

  console.log("");

  await sendMIDIIdentityRequests(this, 200);
  console.log("");

  await flashZoomDevices(this, 250);
  console.log("");
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
    console.log(`  Sending MIDI identity request to device ${i}: "${info.name}"`)
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
      console.log(`  Flashing tuner on MIDI device ${i + 1}, Zoom device ${deviceCounter}: "${output.name()}"`)
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

function addInputListener(input)
{
  let inputName = input.info().name;
  console.log(`  Listening for incoming MIDI messages from device "${inputName}"`);
  input.connect(function(msg) {
    console.log(`  Received MIDI message from device "${inputName}": ${msg.toString()}`);
  });
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
    addInputListener(input);
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

  console.log("");

  listenForMIDIInput(this);
  console.log("");

  await sendMIDIIdentityRequests(this, 200);
  console.log("");

  await flashZoomDevices(this, 250);
  console.log("");

}).onChange(onConnectDisconnect);