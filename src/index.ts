import * as d3 from "d3";
import { drawAlloc } from "./alloc"

function nodeIdLookupMap(nodes: any): Map<string, string> {
  const map = new Map();
  for (let nodeId in nodes) {
    const node = nodes[nodeId];
    map.set(node.name, nodeId);
  }
  return map;
}

function addNodeDiskUsage(nodes: any, allocation: Array<any>) {
  const allocMap = new Map();
  for (let alloc of allocation) {
    allocMap.set(alloc.node, alloc);
  }
  for (let nodeId in nodes) {
    let node = nodes[nodeId];
    node.alloc = allocMap.get(node.name)!;
  }
}

function shardInstanceId(nodeId: string, index: string, shard: string) {
  return `${nodeId}_${index}_${shard}`;
}

function getShardStats(indicesStats: any, index: string, nodeId: string, shard: string) {
  const shardInstances = indicesStats.indices[index].shards[shard];
  for (let inst of shardInstances) {
    if (inst.routing.node == nodeId) {
      return inst;
    }
  }
}

function addShardDiskUsage(shardsDump: any, indicesStats: any, nodeLookup: Map<string, string>) {
  const shardsMap = new Map();
  for (let s of shardsDump) {
    const nodeId = nodeLookup.get(s.node)!;
    const index = s.index;
    const shard = s.shard;
    const shardStats = getShardStats(indicesStats, index, nodeId, shard);
    const shardId = shardInstanceId(nodeId, index, shard);
    s.nodeId = nodeId;
    s.stats = shardStats;
    s.shardId = shardId;
    shardsMap.set(shardId, s);
  }
  return shardsMap;
}

async function draw(dir: FileSystemDirectoryHandle) {
  const allocationDump = await parseDiagFile(dir, "allocation");
  const indicesStatsDump = await parseDiagFile(dir, "indices_stats");
  const nodesDump = await parseDiagFile(dir, "nodes");
  const shardsDump = await parseDiagFile(dir, "shards");
  const clusterState = await parseDiagFile(dir, "cluster_state");

  const nodes = nodesDump.nodes;
  const shards = shardsDump;

  const nodesLookup = nodeIdLookupMap(clusterState.nodes);
  addNodeDiskUsage(nodes, allocationDump);
  addShardDiskUsage(shards, indicesStatsDump, nodesLookup);

  await drawAlloc(nodesDump.cluster_name, shards, allocationDump);
}

// parse json file, filename without json suffix
async function parseDiagFile(dir: FileSystemDirectoryHandle, filename: string): Promise<any> {
  const fh = await dir.getFileHandle(`${filename}.json`);
  const f = await fh.getFile();
  const content = await f.text();
  const obj = JSON.parse(content);
  console.log(filename, obj);
  return obj;
}

async function main() {
  document
    .getElementById("load-bundle")!
    .onclick = async () => {
      d3.select(".board").remove();
      //@ts-ignore
      const diagDir = await window.showDirectoryPicker() as FileSystemDirectoryHandle;
      draw(diagDir);
    };
}

window.addEventListener('load', () => {
  main();
})
