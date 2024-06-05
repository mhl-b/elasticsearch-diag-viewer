import * as d3 from "d3";
import { HierarchyNode } from "d3";
import { displayDiskSize, parseDiskSize } from "./disk";

type Cluster = {
	type: 'cluster',
	name: string,
	nodes: Map<string, ClusterNode>,
}
type ClusterNode = {
	type: 'node',
	name: string,
	shards: Map<string, Shard>,
}
type Shard = {
	type: 'shard',
	name: string,
	index: string,
	shard: string,
	node: string,
	diskSize: number,
}
type ClusterTreeNode = Cluster | ClusterNode | Shard;

function childrenFunc(datum: ClusterTreeNode): Iterable<ClusterNode> | Iterable<Shard> | undefined {
	if (datum.type == 'cluster') {
		let cluster = datum as Cluster;
		return cluster.nodes.values();
	} else if (datum.type == 'node') {
		let node = datum as ClusterNode;
		return node.shards.values();
	} else {
		return undefined;
	}
}

function sumFunc(shard: ClusterTreeNode): number {
	if (shard.type == 'shard') {
		return shard.diskSize;
	}
	return 0;
}

function sortFunc(an: HierarchyNode<ClusterTreeNode>, bn: HierarchyNode<ClusterTreeNode>): number {
	const a = an.data;
	const b = bn.data;
	if (a.type == 'shard' && b.type == 'shard') {
		return a.index.localeCompare(b.index) || a.diskSize - b.diskSize;
	}
	return 0;
}

function buildModel(clusterName: string, shards: any, allocDump: any): Cluster {
	const nodesMap = new Map<string, ClusterNode>();
	for (let shard of shards) {
		let node = nodesMap.get(shard.node);
		if (node === undefined) {
			node = {
				type: 'node',
				name: shard.node,
				shards: new Map(),
			};
		}
		let shardId = shard.shardId;
		node.shards.set(shardId, {
			type: 'shard',
			name: shardId,
			index: shard.index,
			shard: shard.shard,
			node: shard.node,
			diskSize: shard.stats.store.total_data_set_size_in_bytes,
		});
		nodesMap.set(node.name, node);
	}
	for (let allocNode of allocDump) {
		let node = nodesMap.get(allocNode.node);
		if (node === undefined) {
			node = {
				type: 'node',
				name: allocNode.node,
				shards: new Map(),
			};
		}
		node.shards.set('', {
			type: 'shard',
			name: "free",
			index: "FREE",
			shard: "",
			node: allocNode.node,
			diskSize: parseDiskSize(allocNode['disk.avail']),
		});
	}
	return {
		type: 'cluster',
		name: clusterName,
		nodes: nodesMap,
	};
}

export async function drawAlloc(clusterName: string, shards: any, allocDump: any) {
	const view = buildModel(clusterName, shards, allocDump);
	const root = d3.hierarchy(view, childrenFunc)
		.sum(sumFunc)
		.sort(sortFunc);

	const width = 1800;
	const height = 800;

	const treemap = d3.treemap<ClusterTreeNode>()
		.size([width, height])
		.tile(d3.treemapSquarify)
		.padding(2);
	const tree = treemap(root);

	const color = d3.scaleOrdinal(tree.children!.map(d => d.name), d3.schemeTableau10);
	const format = d3.format(",d");

	d3.select("body")
		.append("div")
		.attr("class", "board")
		.selectAll(".shard")
		.data(tree.leaves())
		.enter().append("div")
		.attr("class", "shard")
		.attr("title", function(d) { return d.id + "\n" + format(d.value!); })
		.style("left", function(d) { return d.x0 + "px"; })
		.style("top", function(d) { return d.y0 + "px"; })
		.style("width", function(d) { return d.x1 - d.x0 + "px"; })
		.style("height", function(d) { return d.y1 - d.y0 + "px"; })
		.style("background", d => {
			let shard = d.data as Shard;
			let col =  color(shard.node);
			if (shard.index == 'FREE') {
				col = `#${lightenColor(col.substring(1), 20)}`;
			}
			return col;
		})
		.append("div")
		.attr("class", "shard-label")
		.text(d => {
			let shard = d.data;
			if (shard.type == 'shard') {
				return `${shard.index}\nshard: ${shard.shard}`
			} else {
				return ''
			}
		})
		.append("div")
		.attr("class", "shard-value")
		.text(d => {
			let shard = d.data;
			if (shard.type == 'shard') {
				return displayDiskSize(shard.diskSize);
			} else {
				return '';
			}
		});

}

function lightenColor(color: string, percent: number) {
  	var num = parseInt(color,16),
		amt = Math.round(2.55 * percent),
		R = (num >> 16) + amt,
		B = (num >> 8 & 0x00FF) + amt,
		G = (num & 0x0000FF) + amt;

		return (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
};
