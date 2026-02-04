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

const MAX_BARCODES = 7;

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
                get a &quot;<Text italic>Code too long</Text>&quot; message,
                because the barcode cannot fit on the screen.
            </Text>
        </Section>
    );
}

function trim(s) {
    return s && s.replace(/^\s+|\s+$/g, "");
}

function prettyAgo(t) {
    if (t) {
        t = Date.now() / 1000 - t;
        if (t < 60) {
            return "Saved now!";
        } else if (t < 60 * 60) {
            return "Saved " + Math.floor(t / 60) + " minute(s) ago";
        } else if (t < 24 * 60 * 60) {
            return "Saved " + Math.floor(t / (60 * 60)) + " hour(s) ago";
        }
    }
    return "";
}

function toObj(json) {
    if (!json) return {};
    try {
        return JSON.parse(json);
    } catch (e) {
        return {};
    }
}

function generateExportJson(settings) {
    let barcodes = [];
    for (let i = 1; i <= MAX_BARCODES; i++) {
        let name = toObj(settings["name" + i]).name || "";
        let code = toObj(settings["code" + i]).name || "";
        let color = settings["color" + i];
        let type = toObj(settings["type" + i]).selected;

        if (color && color.charAt(0) === '"') {
            color = color.substr(1, color.length - 2);
        }

        if (code) {
            barcodes.push({
                name: name,
                code: code,
                color: color || "#12D612",
                type: type ? type[0] : 0,
            });
        }
    }
    return JSON.stringify(
        { barcodes: barcodes, bright: settings.bright === "true" },
        null,
        2,
    );
}

function handleImport(settingsStorage, jsonStr) {
    try {
        let data = JSON.parse(jsonStr);
        if (!data.barcodes || !Array.isArray(data.barcodes)) {
            return "Invalid format: missing barcodes array";
        }

        // Clear existing barcodes first
        for (let i = 1; i <= MAX_BARCODES; i++) {
            settingsStorage.setItem("name" + i, JSON.stringify({ name: "" }));
            settingsStorage.setItem("code" + i, JSON.stringify({ name: "" }));
            settingsStorage.setItem("color" + i, '"#12D612"');
            settingsStorage.setItem(
                "type" + i,
                JSON.stringify({ selected: [0] }),
            );
        }

        // Import new barcodes
        let count = Math.min(data.barcodes.length, MAX_BARCODES);
        for (let i = 0; i < count; i++) {
            let barcode = data.barcodes[i];
            let idx = i + 1;
            if (barcode.name) {
                settingsStorage.setItem(
                    "name" + idx,
                    JSON.stringify({ name: barcode.name }),
                );
            }
            if (barcode.code) {
                settingsStorage.setItem(
                    "code" + idx,
                    JSON.stringify({ name: barcode.code }),
                );
            }
            if (barcode.color) {
                settingsStorage.setItem(
                    "color" + idx,
                    '"' + barcode.color + '"',
                );
            }
            if (barcode.type !== undefined) {
                settingsStorage.setItem(
                    "type" + idx,
                    JSON.stringify({ selected: [parseInt(barcode.type, 10)] }),
                );
            }
        }

        if (data.bright !== undefined) {
            settingsStorage.setItem("bright", data.bright ? "true" : "false");
        }

        return "Imported " + count + " barcode(s) successfully!";
    } catch (e) {
        return "Import failed: " + e.message;
    }
}

registerSettingsPage((props) => {
    return (
        <Page>
            {showWarning(props.settings.code1)}
            <Toggle settingsKey="bright" label="Increase screen brightness" />

            {Array.from({ length: MAX_BARCODES }, (_, i) => i + 1).map((n) => (
                <Section title={`Barcode ${n}`} key={n}>
                    <TextInput
                        settingsKey={`name${n}`}
                        title="Name"
                        placeholder="e.g., 7-Eleven"
                    />
                    <TextInput
                        settingsKey={`code${n}`}
                        title="Barcode"
                        placeholder="e.g., 12345678"
                    />
                    <ColorSelect settingsKey={`color${n}`} colors={allColors} />
                    <Select
                        settingsKey={`type${n}`}
                        label="Encoding"
                        options={allTypes}
                    />
                </Section>
            ))}

            <Section description={prettyAgo(props.settings.clickButton)}>
                <Button
                    label="Save"
                    onClick={() =>
                        props.settingsStorage.setItem(
                            "clickButton",
                            "" + Math.floor(Date.now() / 1000),
                        )
                    }
                />
            </Section>

            <Section title="Export Settings">
                <Text>Tap to select, then copy your barcode backup:</Text>
                <Text bold selectable>
                    {generateExportJson(props.settings)}
                </Text>
            </Section>

            <Section title="Import Settings">
                <TextInput
                    settingsKey="importData"
                    title="Paste JSON here"
                    placeholder='{"barcodes":[{"name":"Store","code":"123","color":"#12D612"}]}'
                />
                {props.settings.importStatus && (
                    <Text>{props.settings.importStatus}</Text>
                )}
                <Button
                    label="Import"
                    onClick={() => {
                        let importJson =
                            toObj(props.settings.importData).name || "";
                        let result = handleImport(
                            props.settingsStorage,
                            importJson,
                        );
                        props.settingsStorage.setItem("importStatus", result);
                    }}
                />
            </Section>
        </Page>
    );
});
