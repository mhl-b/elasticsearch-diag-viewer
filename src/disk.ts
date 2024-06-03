const strPattern = new RegExp(/^\s*(?<size>\d+(?:\.\d+)?) *(?<unit>[kmgtpKMGTP]?[bB])?\s*$/);

export type SizeBytes = number;

export function parseDiskSize(diskSize: string): SizeBytes {
	//@ts-ignore
	let { size, unit } = strPattern.exec(diskSize).groups;
	size = Number(size);
	switch (unit) {
		case 'b':
			return size;
		case 'kb':
			return size * 1024;
		case 'mb':
			return size * 1024 ** 2;
		case 'gb':
			return size * 1024 ** 3;
		case 'tb':
			return size * 1024 ** 4;
		default:
			throw new Error(`cannot parse unit: ${unit} from ${diskSize}`);
	}
}

export function displayDiskSize(bytes: SizeBytes): string {
	if (bytes < 1024) {
		return `${bytes}b`
	} else if (bytes < 1024 ** 2) {
		return `${(bytes / 1024).toFixed(2)}kb`
	} else if (bytes < 1024 ** 3) {
		return `${(bytes / 1024 ** 2).toFixed(2)}mb`
	} else if (bytes < 1024 ** 4) {
		return `${(bytes / 1024 ** 3).toFixed(2)}gb`
	} else {
		return `${(bytes / 1024 ** 4).toFixed(2)}tb`
	}
}
