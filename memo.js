one.forEach((text, index) => {
   let output = '';
   let dependenciesFlag = false;
   text.split('\n').forEach((line) => {
       if (dependenciesFlag && /^  /.test(line)) {
           output += `  ${line}\n`;
           return
       }
       dependenciesFlag = false;

       const regexp = /^(version|resolved|integrity)/;
       if (regexp.test(line)) {
           output += `  ${line}\n`;
       } else if (/^dependencies/.test(line) || /^optionalDependencies/.test(line)) {
           output += `  ${line}\n`;
           dependenciesFlag = true;
       } else {
           output += `${line}\n`;
       }
   });

   const hoge = lockfile.parse(output);
   console.log(`Processed index ${index + 1}/${one.length}`);
  
   Object.keys(hoge.object).forEach((key) => {
       const value = hoge.object[key];
       if (value.version && value.resolved) {
           return
       }
       console.log(`${key} is missing version or resolved`);
   });
});
