// Read the server-provided model and cache the DOM nodes used throughout the view.
const vscode = acquireVsCodeApi();
const previewData = JSON.parse(
  document.getElementById("preview-data").textContent,
);
const { translations, selectedId } = previewData;
let widgets = previewData.widgets;
let selectedWidgetId = selectedId;
const topSplitter = document.getElementById("top-splitter");
const bottomSplitter = document.getElementById("bottom-splitter");
const iframe = document.querySelector("iframe");
const searchInput = document.getElementById("preview-search");
const previewTree = document.getElementById("preview-tree");
const controlsList = document.getElementById("controls-list");
const themeControl = document.getElementById("theme-control");

// Apply localized labels before the user can interact with the rendered controls.
searchInput.placeholder = translations.searchWidgets;
searchInput.ariaLabel = translations.searchWidgets;
topSplitter.title = translations.resizeList;
bottomSplitter.title = translations.resizeControls;

document.getElementById("controls-title").textContent = translations.controls;
document.getElementById("theme-label").textContent = translations.theme;

themeControl.options[0].textContent = translations.systemTheme;
themeControl.options[1].textContent = translations.lightTheme;
themeControl.options[2].textContent = translations.darkTheme;

document.getElementById("controls-empty").textContent = translations.noControls;

const pendingControlValues = new Map();
const saved = vscode.getState() ?? {};

// Restore preferences and panel sizes retained by VS Code for this Webview.
themeControl.value =
  saved.themeMode === "vscode" ? "system" : (saved.themeMode ?? "system");

if (typeof saved.topHeight === "number") {
  document.body.style.setProperty("--top-height", saved.topHeight + "px");
}

if (typeof saved.bottomHeight === "number") {
  document.body.style.setProperty("--bottom-height", saved.bottomHeight + "px");
}

const systemBrightness = () =>
  document.body.classList.contains("vscode-dark") ||
  document.body.classList.contains("vscode-high-contrast")
    ? "dark"
    : "light";

// Keep the Flutter preview synchronized with both the selected and system themes.
const sendTheme = () =>
  iframe.contentWindow.postMessage(
    JSON.stringify({
      type: "setBrightness",
      themeMode: themeControl.value,
      systemBrightness: systemBrightness(),
    }),
    "*",
  );

themeControl.addEventListener("change", () => {
  vscode.setState({ ...vscode.getState(), themeMode: themeControl.value });
  sendTheme();
});

iframe.addEventListener("load", () => {
  sendTheme();
  iframe.contentWindow.postMessage(
    JSON.stringify({ type: "requestRegistry" }),
    "*",
  );
});

new MutationObserver(sendTheme).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});

const selectWidget = (id) => {
  // A widget change invalidates control updates still awaiting a runner response.
  pendingControlValues.clear();
  iframe.contentWindow.postMessage(
    JSON.stringify({ type: "selectWidget", id }),
    "*",
  );
  vscode.postMessage({ command: "selectWidget", id });
  selectedWidgetId = id;

  document.querySelectorAll(".preview-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.id === id);
  });
};

const renderControls = (controls) => {
  if (!Array.isArray(controls) || controls.length === 0) {
    if (controlsList.querySelectorAll(".control").length > 0)
      controlsList.replaceChildren();

    let empty = controlsList.querySelector("#controls-empty");

    if (!empty) {
      empty = document.createElement("div");
      empty.id = "controls-empty";
      empty.textContent = translations.noControls;
      controlsList.append(empty);
    }

    return;
  }

  controlsList.querySelector("#controls-empty")?.remove();

  const existingRows = new Map(
    [...controlsList.querySelectorAll(".control")].map((row) => [
      row.dataset.id,
      row,
    ]),
  );

  let cursor = controlsList.firstElementChild;
  let renderedCount = 0;

  // Reuse existing rows to preserve focus while reconciling the latest controls.
  for (const control of controls) {
    const kinds = ["string", "integer", "boolean", "double", "color", "enum"];
    if (!kinds.includes(control.kind)) {
      continue;
    }

    renderedCount += 1;
    let row = existingRows.get(control.id);
    if (!row) {
      row = document.createElement("label");
      row.className = "control";
      row.dataset.id = control.id;
      row.innerHTML =
        control.kind === "enum"
          ? '<span class="control-label"></span><select class="control-input"></select>'
          : '<span class="control-label"></span><input class="control-input">';

      const input = row.querySelector("input, select");
      input.addEventListener("input", () => {
        const value =
          input.dataset.kind === "boolean"
            ? String(input.checked)
            : input.value === ""
              ? null
              : input.value;

        if (
          value == null &&
          !control.nullable &&
          !(
            (control.kind === "enum" || control.kind === "string") &&
            control.hasDefault
          )
        ) {
          input.value = String(control.value ?? "");
          return;
        }

        pendingControlValues.set(row.dataset.id, value);
        iframe.contentWindow.postMessage(
          JSON.stringify({
            type: "updateControl",
            id: row.dataset.id,
            value,
          }),
          "*",
        );
      });
    }

    existingRows.delete(control.id);

    if (row !== cursor) controlsList.insertBefore(row, cursor);
    cursor = row.nextElementSibling;

    const name = row.querySelector(".control-label");
    name.textContent = control.name;

    const input = row.querySelector("input, select");
    input.dataset.kind = control.kind;

    if (input instanceof HTMLInputElement) {
      input.type =
        control.kind === "boolean"
          ? "checkbox"
          : control.kind === "integer" || control.kind === "double"
            ? "number"
            : control.kind === "color"
              ? "color"
              : "text";
    }

    input.className =
      control.kind === "boolean"
        ? "control-checkbox"
        : control.kind === "color"
          ? "control-color"
          : "control-input";

    input.step = control.kind === "double" ? "any" : "1";

    if (control.kind === "enum") {
      const selectedValue = input.value;
      const options = (control.options ?? []).map((option) => {
        const element = document.createElement("option");
        element.value = option.value;
        element.textContent = option.label;
        return element;
      });

      if (control.nullable || control.hasDefault) {
        const emptyOption = document.createElement("option");
        emptyOption.value = "";

        const defaultOption = (control.options ?? []).find(
          (option) => option.value === control.defaultValue,
        );

        emptyOption.textContent = control.hasDefault
          ? `${translations.defaultOption} (${defaultOption?.label ?? control.defaultValue})`
          : translations.noneOption;

        options.unshift(emptyOption);
      }
      input.replaceChildren(...options);
      input.value = selectedValue;
    }

    const pendingValue = pendingControlValues.get(control.id);

    // Ignore echoed values until the runner acknowledges the user's pending edit.
    const isEcho =
      pendingControlValues.has(control.id) &&
      pendingValue === control.mayBeValue;

    if (isEcho) pendingControlValues.delete(control.id);
    if (
      !pendingControlValues.has(control.id) &&
      (!isEcho || control.mayBeValue == null) &&
      control.kind === "boolean"
    ) {
      input.checked = control.value === "true";
    } else if (!pendingControlValues.has(control.id) && !isEcho) {
      const nextValue =
        (control.kind === "enum" || control.kind === "string") &&
        control.mayBeValue == null
          ? ""
          : String(control.value ?? "");
      if (input.value !== nextValue) input.value = nextValue;
    }
    if (control.kind === "string" && control.defaultValue != null) {
      input.placeholder = String(control.defaultValue);
    } else {
      input.removeAttribute("placeholder");
    }
    if (control.maxLength == null) input.removeAttribute("maxlength");
    else input.maxLength = control.maxLength;
    if (control.min == null) input.removeAttribute("min");
    else input.min = control.min;
    if (control.max == null) input.removeAttribute("max");
    else input.max = control.max;
    row.querySelector(".control-description")?.remove();
    if (control.description) {
      const description = document.createElement("span");
      description.className = "control-description";
      description.textContent = control.description;
      row.append(description);
    }
  }
  for (const row of existingRows.values()) row.remove();
  if (renderedCount === 0) renderControls([]);
};

// Receive control metadata published by the embedded Flutter application.
window.addEventListener("message", (event) => {
  let message = event.data;
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch {
      return;
    }
  }

  if (message?.type === "previewControls") {
    renderControls(message.controls);
  } else if (message?.type === "previewRegistry") {
    if (!Array.isArray(message.widgets)) return;

    widgets = message.widgets
      .filter(
        (preview) =>
          typeof preview?.id === "string" &&
          typeof preview?.name === "string" &&
          Array.isArray(preview?.groups),
      )
      .map((preview) => ({
        id: preview.id,
        name: preview.name,
        groups:
          preview.groups.length > 0
            ? preview.groups
            : [translations.otherGroup],
      }));
    renderTree(searchInput.value);
  }
});

const createGroupNode = () => ({ children: new Map(), widgets: [] });

const buildGroupTree = (previews) => {
  const root = createGroupNode();

  for (const preview of previews) {
    let node = root;
    for (const groupName of preview.groups) {
      if (!node.children.has(groupName)) {
        node.children.set(groupName, createGroupNode());
      }
      node = node.children.get(groupName);
    }
    node.widgets.push(preview);
  }

  return root;
};

const countWidgets = (node) => {
  let count = node.widgets.length;
  for (const child of node.children.values()) count += countWidgets(child);
  return count;
};

const renderGroup = (parent, groupName, node, depth, searching) => {
  const details = document.createElement("details");
  details.className = "preview-group";
  details.style.setProperty("--tree-depth", depth);
  details.open = searching || nodeContainsSelected(node);

  const summary = document.createElement("summary");
  summary.innerHTML =
    '<span class="group-name"></span><span class="count"></span>';
  summary.querySelector(".group-name").textContent = groupName;
  summary.querySelector(".count").textContent = countWidgets(node);
  details.append(summary);

  for (const preview of node.widgets) {
    const item = document.createElement("button");
    item.type = "button";
    item.className =
      "preview-item" + (preview.id === selectedWidgetId ? " active" : "");
    item.style.setProperty("--tree-depth", depth);
    item.dataset.id = preview.id;
    item.textContent = preview.name;
    item.addEventListener("click", () => selectWidget(preview.id));
    details.append(item);
  }

  for (const [childName, child] of node.children) {
    renderGroup(details, childName, child, depth + 1, searching);
  }

  parent.append(details);
};

const nodeContainsSelected = (node) =>
  node.widgets.some((preview) => preview.id === selectedWidgetId) ||
  [...node.children.values()].some(nodeContainsSelected);

// Rebuild the nested group tree for the current search query.
const renderTree = (query = "") => {
  previewTree.replaceChildren();
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const visible = widgets.filter((preview) =>
    [preview.name, ...preview.groups]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );
  const root = buildGroupTree(visible);

  for (const [groupName, node] of root.children) {
    renderGroup(previewTree, groupName, node, 0, normalizedQuery.length > 0);
  }
};

searchInput.addEventListener("input", () => renderTree(searchInput.value));
renderTree();

// Resize either sidebar panel while keeping enough room for the remaining content.
const makePanelResizable = (splitter, panel) => {
  splitter.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    splitter.setPointerCapture(event.pointerId);
    document.body.classList.add("splitting");
    iframe.style.pointerEvents = "none";
    const startY = event.clientY;
    const startHeight =
      panel === "top"
        ? document.getElementById("preview-browser").getBoundingClientRect()
            .height
        : document.getElementById("preview-controls").getBoundingClientRect()
            .height;

    const move = (moveEvent) => {
      const direction = panel === "top" ? 1 : -1;
      const available = Math.max(50, document.body.clientHeight - 110);
      const nextHeight = Math.max(
        50,
        Math.min(
          startHeight + (moveEvent.clientY - startY) * direction,
          available,
        ),
      );
      document.body.style.setProperty(
        panel === "top" ? "--top-height" : "--bottom-height",
        nextHeight + "px",
      );
      vscode.setState({
        ...vscode.getState(),
        [panel === "top" ? "topHeight" : "bottomHeight"]: nextHeight,
      });
    };

    const finish = () => {
      document.body.classList.remove("splitting");
      iframe.style.pointerEvents = "";
      splitter.removeEventListener("pointermove", move);
      splitter.removeEventListener("pointerup", finish);
      splitter.removeEventListener("pointercancel", finish);
    };
    splitter.addEventListener("pointermove", move);
    splitter.addEventListener("pointerup", finish);
    splitter.addEventListener("pointercancel", finish);
  });
};

makePanelResizable(topSplitter, "top");
makePanelResizable(bottomSplitter, "bottom");
