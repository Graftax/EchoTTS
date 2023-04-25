import fs from "node:fs/promises";
import path from "node:path";

// Read the json config
fs.readFile("precompile.json", "utf-8").then((value) => {

	// parse json
	let config = JSON.parse(value);

	// For each object in the "indexes" list
	config.indexes.forEach((element) => {
		
		// Get the current list of files
		fs.readdir(element.path).then((currFilepaths) => {

			console.log(`Generating index for ${element.path} at ${element.file}`);
			// Calculate os-neutral path
			let currOutPath = path.resolve(element.file);

			// Create the list of import strings at the top of the file
			// We filter out the output file in case its within the same directory.
			let importList = currFilepaths.map((currPath) => {

				let currFullPath = path.resolve(element.path, currPath);
				if(currFullPath == currOutPath)
					return null;

				// Get the relative path from the dir the out file is in to the target file
				let fromTarget = path.relative(path.dirname(currOutPath), currFullPath);

				// We only want forward slashes since this will be TS code.
				fromTarget = fromTarget.replace(/\\/g, "/");
				fromTarget = fromTarget.replace(/.ts$/g, ".js");
				//fromTarget = fromTarget.replace(/\.[^/.]+$/g, "");

				if(!fromTarget.startsWith("."))
					fromTarget = "./" + fromTarget;

				return {
					name: path.parse(currPath).name,
					from: fromTarget
				};

			});

			// If we generated a null entry, should be removed.
			importList = importList.filter((currImport) => {
				return currImport != null;
			});

			// Make sure folders exist.
			fs.mkdir(path.dirname(currOutPath), {recursive: true});

			// Write the the output, "w" to create if necessary
			fs.open(element.file, "w").then(async (outFile) => {

				await outFile.write("// This is an auto-generated file. Do not edit.\n");
				
				for(let currImport of importList) {
					await outFile.write(`import ${currImport.name} from "${currImport.from}"\n`);
				}

				await outFile.write("\n");
				await outFile.write("export default {\n");

				for(let currImport of importList) {
					await outFile.write(`\t${currImport.name}: ${currImport.name},\n`);
				}

				await outFile.write("};");

			});

		});

	});

});