var allColors = [
    { color: "#FF4949" }, //red
    { color: "#FEB300" }, //orange
    { color: "#DAD700" }, //yellow
    { color: "#25FF86" }, //lime
    { color: "#12D612" }, //green
    { color: "#6FD4ED" }, //light blue
    { color: "#535BFF" }, //blue
    { color: "#FF40FF" }, //purple
    { color: "#C6643E" }, //brown
    { color: "#808080" }, //grey
];

var allTypes = [
    { name: "EAN/UPC/Code-128", value: "0" },
    { name: "Code-128", value: "1" },
    { name: "Code-39", value: "2" },
];

var numBarcodeRows = 10;

function showWarning(str) {
    try {
        if (!JSON.parse(str).name) return null;
    } catch (e) {
        return null;
    }
    return (
        <Section
            title={
                <Text>
                    Tip: What does &quot;<Text bold>Code too long</Text>&quot;
                    mean?
                </Text>
            }
        >
            <Text>
                The more characters your barcode has, the more horizontal space
                is required to display the barcode. When the required barcode
                space exceeds the physical screen space of your device, you will
                get a &quot;
                <Text italic>Code too long</Text>&quot; message, because the
                barcode cannot fit on the screen.
            </Text>
        </Section>
    );
}

function trim(s) {
    return s && s.replace(/^\s+|\s+$/g, "");
}

function toObj(json) {
    if (!json) return {};
    try {
        return JSON.parse(json);
    } catch (e) {
        return {};
    }
}

function getLogLines(json) {
    if (!json) return [];
    try {
        let arr = JSON.parse(json);
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function exportBarcodes(props) {
    let exported = [];
    for (let i = 0; i < barcodeEntries.length; i++) {
        let entry = barcodeEntries[i];
        let name = toObj(props.settings[entry.nameKey]).name || "";
        let code = toObj(props.settings[entry.codeKey]).name || "";
        let color = props.settings[entry.colorKey] || "";
        let typeVal = toObj(props.settings[entry.typeKey]);
        let type = typeVal.selected ? typeVal.selected[0] : "";
        if (code) {
            exported.push({
                name: name,
                code: code,
                color: trim(color),
                type: type,
            });
        }
    }
    return JSON.stringify(exported, null, 2);
}

function importBarcodes(props, jsonStr) {
    try {
        let data = JSON.parse(jsonStr);
        if (!Array.isArray(data)) return false;
        // Clear existing
        for (let i = 0; i < barcodeEntries.length; i++) {
            let entry = barcodeEntries[i];
            props.settingsStorage.removeItem(entry.nameKey);
            props.settingsStorage.removeItem(entry.codeKey);
            props.settingsStorage.removeItem(entry.colorKey);
            props.settingsStorage.removeItem(entry.typeKey);
        }
        // Import new
        for (let i = 0; i < data.length && i < barcodeEntries.length; i++) {
            let item = data[i];
            let entry = barcodeEntries[i];
            if (item.name)
                props.settingsStorage.setItem(
                    entry.nameKey,
                    JSON.stringify({ name: item.name }),
                );
            if (item.code)
                props.settingsStorage.setItem(
                    entry.codeKey,
                    JSON.stringify({ name: item.code }),
                );
            if (item.color)
                props.settingsStorage.setItem(entry.colorKey, item.color);
            if (item.type)
                props.settingsStorage.setItem(
                    entry.typeKey,
                    JSON.stringify({ selected: [item.type] }),
                );
        }
        return true;
    } catch (e) {
        return false;
    }
}

var barcodeEntries = [];
for (var i = 1; i <= numBarcodeRows; i++) {
    barcodeEntries.push({
        key: String(i),
        title: "Barcode " + i,
        nameKey: "name" + i,
        codeKey: "code" + i,
        colorKey: "color" + i,
        typeKey: "type" + i,
        namePlaceholder: "e.g., 7-Eleven",
        codePlaceholder: "e.g., 12345678",
        defaultColor: allColors[(i - 1) % allColors.length].color,
    });
}

registerSettingsPage((props) => {
    let logLines = getLogLines(props.settings.appLog);
    let errorMsg = toObj(props.settings.appError).name;
    let exportData = exportBarcodes(props);

    let barcodeSections = [];
    for (let i = 0; i < barcodeEntries.length; i++) {
        let entry = barcodeEntries[i];
        barcodeSections.push(
            <Section key={entry.key} title={entry.title}>
                <TextInput
                    settingsKey={entry.nameKey}
                    title="Name"
                    placeholder={entry.namePlaceholder}
                />
                <TextInput
                    settingsKey={entry.codeKey}
                    label="Barcode"
                    placeholder={entry.codePlaceholder}
                />
                <ColorSelect settingsKey={entry.colorKey} colors={allColors} />
                <Select
                    settingsKey={entry.typeKey}
                    label="Encoding"
                    options={allTypes}
                />
            </Section>,
        );
    }

    return (
        <Page>
            <Section title="Status Log">
                {logLines.length === 0 ? (
                    <Text>No activity yet. Open the app on your watch.</Text>
                ) : (
                    logLines.map((line, i) => <Text key={i}>{line}</Text>)
                )}
                {logLines.length > 0 && (
                    <Button
                        label="Clear Log"
                        onClick={() =>
                            props.settingsStorage.removeItem("appLog")
                        }
                    />
                )}
            </Section>
            {errorMsg && (
                <Section title="App Error">
                    <Text bold>{errorMsg}</Text>
                    <Button
                        label="Clear Error"
                        onClick={() =>
                            props.settingsStorage.removeItem("appError")
                        }
                    />
                </Section>
            )}
            {showWarning(props.settings.code1)}
            <Toggle settingsKey="bright" label="Increase screen brightness" />

            {barcodeSections}

            <Section title="Export Barcodes">
                <Text>Copy this JSON to back up your barcodes:</Text>
                <TextInput
                    settingsKey="exportData"
                    title="Export Data"
                    value={exportData}
                    disabled={true}
                />
                <Button
                    label="Refresh Export"
                    onClick={() => {
                        props.settingsStorage.setItem(
                            "exportData",
                            JSON.stringify({ name: exportBarcodes(props) }),
                        );
                    }}
                />
            </Section>

            <Section title="Import Barcodes">
                <Text>Paste JSON here to import barcodes:</Text>
                <TextInput
                    settingsKey="importData"
                    title="Import Data"
                    placeholder='[{"name":"Store","code":"123","color":"#12D612","type":"0"}]'
                />
                <Button
                    label="Import"
                    onClick={() => {
                        let importStr =
                            toObj(props.settings.importData).name || "";
                        if (importStr && importBarcodes(props, importStr)) {
                            props.settingsStorage.removeItem("importData");
                        }
                    }}
                />
            </Section>

            <Section title="Danger Zone">
                <Button
                    label="Clear All Barcodes"
                    onClick={() => {
                        for (let i = 0; i < barcodeEntries.length; i++) {
                            let entry = barcodeEntries[i];
                            props.settingsStorage.removeItem(entry.nameKey);
                            props.settingsStorage.removeItem(entry.codeKey);
                            props.settingsStorage.removeItem(entry.colorKey);
                            props.settingsStorage.removeItem(entry.typeKey);
                        }
                        props.settingsStorage.removeItem("bright");
                    }}
                />
            </Section>
        </Page>
    );
});
