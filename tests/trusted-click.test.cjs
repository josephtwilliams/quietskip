const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const shared = fs.readFileSync('extension/shared.js', 'utf8');
const source = fs.readFileSync('extension/background.js', 'utf8');
function setup(point = {x: 400, y: 300}, fail = false) {
  let listener;
  const commands = [];
  vm.runInNewContext(shared + source, {importScripts() {}, Date, Number, Set, Map, chrome: {
    runtime: {onMessage: {addListener: fn => { listener = fn; }}},
    tabs: {onRemoved: {addListener() {}}},
    debugger: {
      attach: async () => { commands.push('attach'); },
      detach: async () => { commands.push('detach'); },
      sendCommand: async (target, command, params) => {
        commands.push(command);
        if (command === 'Runtime.evaluate') return {result: {value: point}};
        if (fail) throw new Error('Click failed');
        return {};
      }
    }
  }});
  return {
    commands,
    run: (sender = {tab: {id: 1}, frameId: 0, url: 'https://www.youtube.com/watch?v=test'}) =>
      new Promise(resolve => listener({type: 'trusted-skip'}, sender, resolve))
  };
}
test('rejects messages from other origins before attaching', async () => {
  const env = setup();
  const response = await env.run({tab: {id:1},frameId:0,url:'https://example.com/'});
  assert.ok(response.error); assert.deepEqual(env.commands, []);
});
test('sends press and release and detaches', async () => {
  const env = setup(); const response = await env.run();
  assert.equal(response.clicked, true);
  assert.deepEqual(env.commands, ['attach','Runtime.evaluate','Input.dispatchMouseEvent','Input.dispatchMouseEvent','detach']);
});
test('stale or unavailable Skip results in no input', async () => {
  const env = setup(null); const response = await env.run();
  assert.equal(response.skipped, true);
  assert.deepEqual(env.commands, ['attach','Runtime.evaluate','detach']);
});
test('detaches even when browser input fails', async () => {
  const env = setup({x: 400,y: 300}, true); const response = await env.run();
  assert.equal(response.error, 'Click failed');
  assert.equal(env.commands.at(-1), 'detach');
});

test('serialized shared lookup rejects stale ads and covered controls', () => {
  const context = vm.createContext({importScripts(){}, chrome:{runtime:{onMessage:{addListener(){}}},tabs:{onRemoved:{addListener(){}}}}});
  vm.runInContext(shared + source, context);
  const expression = vm.runInContext('locateSkip', context);
  let ad = true, covered = false;
  const button = {disabled:false, querySelector:()=>null, getAttribute:()=>null,
    getClientRects:()=>[{}], getBoundingClientRect:()=>({left:10,top:20,width:40,height:20}), contains:()=>false};
  const player = {classList:{contains:()=>ad},querySelectorAll:()=>[button]};
  const page = {location:{origin:'https://www.youtube.com'}, document:{getElementById:()=>player,elementFromPoint:()=>covered?{}:button},
    getComputedStyle:()=>({display:'block',visibility:'visible',pointerEvents:'auto',opacity:'1'})};
  assert.equal(JSON.stringify(vm.runInNewContext(expression,page)), JSON.stringify({x:30,y:30}));
  covered=true; assert.equal(vm.runInNewContext(expression,page), null);
  covered=false; ad=false; assert.equal(vm.runInNewContext(expression,page), null);
  ad=true; button.disabled=true; assert.equal(vm.runInNewContext(expression,page), null);
});
