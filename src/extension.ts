import path from "node:path";
import * as vscode from "vscode";
export function activate(context: vscode.ExtensionContext) {
  // 右键菜单
  const disposable_showMenu = vscode.commands.registerCommand(
    "extension.myRightClickCommand",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const position = editor.selection.active;
        // 获取文件名和行号
        const fileName = document.fileName;
        const baseName = path.basename(fileName);
        const lineNumber = position.line + 1; // 行号从0开始，所以+1
        // 获取用户输入的label
        const inputLabel = await vscode.window.showInputBox({
          prompt: "请输入标记内容(Please enter the marking content)",
        });
        if (inputLabel) {
          myTreeDataProvider.addItem(
            inputLabel,
            fileName,
            baseName,
            lineNumber
          );
          // 切换到自定义视图
          vscode.commands.executeCommand("workbench.view.explorer"); // 切换到资源管理器视图
          vscode.commands.executeCommand("flagView.focus"); // 焦点定位到自定义树视图
          // treeView.reveal(myTreeDataProvider); // 焦点定位到自定义树视图
        }
      } else {
        vscode.window.showWarningMessage("No active editor");
      }
    }
  );
  // 跳转到标记行
  const disposable_open = vscode.commands.registerCommand(
    "extension.openFileAtLine",
    (filePath: string, lineNumber: number) => {
      const openPath = vscode.Uri.file(filePath);
      vscode.workspace.openTextDocument(openPath).then((doc) => {
        vscode.window.showTextDocument(doc).then((editor) => {
          const position = new vscode.Position(lineNumber - 1, 0); // 行号从0开始，所以-1
          const selection = new vscode.Selection(position, position);
          editor.selection = selection;
          editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
        });
      });
    }
  );
  // 注册删除 TreeItem 的命令
  const disposable_delete = vscode.commands.registerCommand(
    "extension.deleteTreeItem",
    (item: TreeItem) => {
      myTreeDataProvider.deleteItem(item);
    }
  );
  // 注册修改 TreeItem 的命令
  const disposable_edit = vscode.commands.registerCommand(
    "extension.editTreeItem",
    async (item: TreeItem) => {
      const newLabel = await vscode.window.showInputBox({
        prompt: "请输入分组内容(Please enter the marking content)",
        value: item.label,
      });
      if (newLabel) {
        myTreeDataProvider.editItem(item, newLabel);
      }
    }
  );
  // 注册创建分组的命令
  const disposable_createGroup = vscode.commands.registerCommand(
    "extension.createGroup",
    async (item: TreeItem) => {
      const newLabel = await vscode.window.showInputBox({
        prompt: "请输入分组名称(Please enter the Group name)",
      });
      if (newLabel) {
        console.log(treeView.selection);
        myTreeDataProvider.createGroup(item, newLabel, treeView.selection);
      }
    }
  );
  // 改变颜色的命令
  const disposable_changeColor = vscode.commands.registerCommand(
    "extension.changeColor",
    async (item: TreeItem) => {
      myTreeDataProvider.changeColor(item);
    }
  );
  // 侧边栏
  const myTreeDataProvider = new MyTreeDataProvider(context);
  // 创建自定义视图
  /*
  registerTreeDataProvider 用于注册一个数据提供者 (TreeDataProvider) 给指定的视图 ID。
  这个方法不会实际创建树视图，但它会将数据提供者与某个现有的或即将创建的树视图关联起来。

  createTreeView 实际上创建并返回一个树视图 (TreeView) 对象，并允许你对该视图进行更多的控制，
  如设置拖放控制器、处理选中项等。

  简单数据展示：如果你只需要将数据展示在树视图中，并且不需要额外的控制，使用 registerTreeDataProvider 就足够了。
  高级控制：如果你需要实现诸如拖放、多选等高级功能，或者需要对视图进行进一步的控制，使用 createTreeView 会更适合。
   */
  const treeView = vscode.window.createTreeView("flagView", {
    treeDataProvider: myTreeDataProvider,
    dragAndDropController: myTreeDataProvider,
    canSelectMany: true, // 允许多选，这样可以同时拖动多个项目
  });
  // vscode.window.registerTreeDataProvider("flagView", myTreeDataProvider);
  context.subscriptions.push(
    disposable_showMenu,
    disposable_open,
    disposable_delete,
    disposable_edit,
    disposable_changeColor,
    disposable_createGroup
  );
}

// 左侧菜单子项
class TreeItem extends vscode.TreeItem {
  constructor(
    public id: string,
    public label: string,
    public fileName: string,
    public baseName: string,
    public lineNumber: number,
    public theme: number,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public pid?: string
  ) {
    super(label, collapsibleState);

    // 设置描述信息，可以用于显示文件名和行号
    this.description = `${baseName}:${lineNumber}`;

    // 设置工具提示，可以提供更多详细信息
    this.tooltip = path.join(__filename, "..", "..", "resources", "flag.svg");
    this.theme = theme;
    // 设置图标，可以使用本地资源或者 VSCode 内置的图标
    this.setIconPaths();

    this.command = {
      command: "extension.openFileAtLine",
      title: "Open File at Line",
      arguments: [this.fileName, this.lineNumber],
    };
    // 设置上下文值，用于区分不同类型的树节点，以便在右键菜单进行操作
    this.contextValue = "flagItem";
  }
  setTheme(theme: number) {
    this.theme = theme;
  }
  setIconPaths() {
    this.iconPath = {
      light: path.join(
        __filename,
        "..",
        "..",
        "resources",
        `flag_${this.theme}.svg`
      ),
      dark: path.join(
        __filename,
        "..",
        "..",
        "resources",
        `flag_${this.theme}.svg`
      ),
    };
  }
}
// 左侧菜单组子项
class TreeItemGroup extends vscode.TreeItem {
  constructor(
    public id: string,
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public children: TreeItem[]
  ) {
    super(label, collapsibleState);
    // 设置工具提示，可以提供更多详细信息
    this.tooltip = path.join(__filename, "..", "..", "resources", "flag.svg");

    // 设置图标，可以使用本地资源或者 VSCode 内置的图标
    this.setIconPaths();
    // 设置上下文值，用于区分不同类型的树节点，以便在右键菜单进行操作
    this.contextValue = "flagItemGroup";
  }
  setIconPaths() {
    this.iconPath = {
      light: path.join(__filename, "..", "..", "resources", `group.svg`),
      dark: path.join(__filename, "..", "..", "resources", `group.svg`),
    };
  }
}
class MyTreeDataProvider
  implements vscode.TreeDataProvider<TreeItem | TreeItemGroup>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeItem | TreeItemGroup | undefined | void
  > = new vscode.EventEmitter<TreeItem | TreeItemGroup | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TreeItem | TreeItemGroup | undefined | void
  > = this._onDidChangeTreeData.event;

  private items: Array<TreeItem | TreeItemGroup> = [];
  private context: vscode.ExtensionContext;
  public dropMimeTypes: string[] = ["application/vnd.code.tree.flagView"];
  public dragMimeTypes: string[] = ["application/vnd.code.tree.flagView"];
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadItemsFromStorage();
  }
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }
  getChildren(
    element?: TreeItem | TreeItemGroup
  ): Thenable<(TreeItem | TreeItemGroup)[]> {
    if (element instanceof TreeItemGroup) {
      return Promise.resolve(element.children);
    } else {
      // Return root items
      return Promise.resolve(this.items);
    }
  }

  addItem(
    label: string,
    fileName: string,
    baseName: string,
    lineNumber: number
  ): void {
    const id = `${fileName}:${lineNumber}:${new Date().getTime()}`;
    const newItem = new TreeItem(
      id,
      label,
      fileName,
      baseName,
      lineNumber,
      1,
      vscode.TreeItemCollapsibleState.None
    );

    this.items.push(newItem);
    this.saveItemsToStorage();
    this._onDidChangeTreeData.fire();
  }
  deleteItem(item: TreeItem): void {
    // this.items = this.items.filter((i) => i !== item);
    this.deleteItemRecursively(item, this.items);
    this._onDidChangeTreeData.fire();
    this.saveItemsToStorage();
  }

  editItem(item: TreeItem | TreeItemGroup, newLabel: string): void {
    const foundItem = this.items.find((i) => i === item);
    if (foundItem) {
      foundItem.label = newLabel;
    }
    this.saveItemsToStorage();
    this._onDidChangeTreeData.fire();
  }
  createGroup(
    item: TreeItem,
    newLabel: string,
    group: readonly (TreeItem | TreeItemGroup)[]
  ): void {
    const id = `${newLabel}:${new Date().getTime()}`;
    // Collapsed折叠   Expanded展开   None没有子项
    const newItem = new TreeItemGroup(
      id,
      newLabel,
      vscode.TreeItemCollapsibleState.Collapsed,
      []
    );
    // 如果有选中并且当前右键的元素包含在选中中
    if (group.length > 0 && group.find((i) => i === item)) {
      group.forEach((treeItem) => {
        if (treeItem instanceof TreeItem) {
          this.items = this.items.filter((i) => i !== treeItem);
          treeItem.pid = newItem.id;
          newItem.children.push(treeItem);
        }
      });
    } else {
      this.items = this.items.filter((i) => i !== item);
      item.pid = newItem.id;
      newItem.children.push(item);
    }

    this.items.push(newItem);
    this.saveItemsToStorage();
    this._onDidChangeTreeData.fire();
    console.log("创建分组");
    console.log(this.items);
  }

  changeColor(item: TreeItem) {
    if (item) {
      item.setTheme((item.theme++ % 7) + 1);
      item.setIconPaths();
      console.log(item.theme);
    }
    this.saveItemsToStorage();
    this._onDidChangeTreeData.fire();
  }

  // 添加拖放支持
  async handleDrag(
    source: TreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    dataTransfer.set(
      "application/vnd.code.tree.flagView",
      new vscode.DataTransferItem(source)
    );
  }

  async handleDrop(
    target: TreeItem | TreeItemGroup | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const transferItem = dataTransfer.get("application/vnd.code.tree.flagView");
    if (!transferItem) {
      return;
    }

    const draggedItems: (TreeItem | TreeItemGroup)[] = transferItem.value as (
      | TreeItem
      | TreeItemGroup
    )[];

    // 执行你需要的拖拽处理逻辑
    if (target) {
      // 如果目标存在，将项目移动到目标位置的后面
      // 如果目标是一个TreeItemGroup，则将项目移动到该组中
      if (target instanceof TreeItemGroup) {
        console.log("移动到组中");
        draggedItems.forEach((treeItem) => {
          console.log(treeItem);
          console.log(treeItem instanceof TreeItem);
          if (treeItem instanceof TreeItem) {
            // this.items = this.items.filter((i) => i !== treeItem);
            this.deleteItemRecursively(treeItem, this.items);
            console.log(treeItem);
            treeItem.pid = target.id;
            target.children.push(treeItem);
            console.log(target);
          }
        });
      }
      // 如果目标是一个TreeItem，则将项目移动到该项目的后面
      else {
        console.log("************");
        let newParentLevel: (TreeItemGroup | TreeItem)[];
        if (target.pid) {
          newParentLevel = (
            this.items.find((i) => i.id === target.pid) as TreeItemGroup
          ).children;
        } else {
          newParentLevel = this.items;
        }
        console.log("newParentLevel");
        console.log(newParentLevel);
        const targetIndex = newParentLevel.indexOf(target);
        console.log(targetIndex);

        draggedItems.forEach((treeItem) => {
          this.deleteItemRecursively(treeItem, this.items);
          console.log(newParentLevel);
          console.log(treeItem instanceof TreeItem);
          newParentLevel.splice(targetIndex + 1, 0, treeItem);
          console.log(newParentLevel);
          console.log(this.items);
        });

        // this.items = this.items.filter((item) => !draggedItems.includes(item));
        // this.items.splice(targetIndex + 1, 0, ...draggedItems);
      }
    } else {
      // 如果目标不存在，则将项目移动到末尾
      draggedItems.forEach((treeItem) => {
        this.deleteItemRecursively(treeItem, this.items);
        if (treeItem instanceof TreeItem) {
          treeItem.pid = "";
        }
        this.items.push(treeItem);
        console.log("末尾");
        console.log(this.items);
        console.log(treeItem instanceof TreeItem);
      });
      // this.items = this.items.filter((item) => !draggedItems.includes(item));
      // this.items.push(...draggedItems);
    }

    this.saveItemsToStorage();
    this._onDidChangeTreeData.fire();
  }

  private deleteItemRecursively(
    item: TreeItem | TreeItemGroup,
    items: (TreeItem | TreeItemGroup)[]
  ): void {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i] === item) {
        items.splice(i, 1);
      } else if (
        items[i] instanceof TreeItemGroup &&
        (items[i] as TreeItemGroup).children
      ) {
        this.deleteItemRecursively(item, (items[i] as TreeItemGroup).children);
      }
    }
  }
  private saveItemsToStorage(): void {
    this.context.globalState.update("flagItems", this.items);
  }
  private loadItemsFromStorage(): void {
    this.items = this.createTreeItemFromLocal();
    console.log(this.items);
  }
  private createTreeItemFromLocal(
    child?: TreeItem[]
  ): (TreeItem | TreeItemGroup)[] {
    const storedItems = child
      ? child
      : this.context.globalState.get<(TreeItem | TreeItemGroup)[]>(
          "flagItems",
          []
        );
    return storedItems.map((item) => {
      if ("fileName" in item) {
        return new TreeItem(
          item.id,
          item.label,
          item.fileName,
          item.baseName,
          item.lineNumber,
          item.theme,
          vscode.TreeItemCollapsibleState.None,
          item.pid
        );
      } else {
        return new TreeItemGroup(
          item.id,
          item.label,
          vscode.TreeItemCollapsibleState.Collapsed,
          this.createTreeItemFromLocal(item.children) as TreeItem[]
        );
      }
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

export function deactivate() {}
