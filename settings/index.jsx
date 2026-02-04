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

function getLogLines(json) {
    if (!json) return [];
    try {
        let arr = JSON.parse(json);
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
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
                        props.settingsStorage.setItem(
                            "clickButton",
                            "" + Math.floor(Date.now() / 1000),
                        );
                    }}
                />
            </Section>
        </Page>
    );
});
