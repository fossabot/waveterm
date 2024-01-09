// Copyright 2023, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from "react";
import * as mobxReact from "mobx-react";
import * as mobx from "mobx";
import { boundMethod } from "autobind-decorator";
import { If, For } from "tsx-control-statements/components";
import cn from "classnames";
import { GlobalModel, RemotesModel, GlobalCommandRunner } from "../../model/model";
import { Button, IconButton, Status } from "../common/common";
import * as T from "../../types/types";
import * as util from "../../util/util";

import "./connections.less";

type OV<V> = mobx.IObservableValue<V>;

@mobxReact.observer
class ConnectionsView extends React.Component<{ model: RemotesModel }, { hoveredItemId: string }> {
    tableRef: React.RefObject<any> = React.createRef();
    tableWidth: OV<number> = mobx.observable.box(0, { name: "tableWidth" });
    tableRszObs: ResizeObserver = null;

    constructor(props) {
        super(props);
        this.state = {
            hoveredItemId: null,
        };
    }

    checkWidth() {
        if (this.tableRef.current != null) {
            mobx.action(() => {
                this.tableWidth.set(this.tableRef.current.offsetWidth);
            })();
        }
    }

    @boundMethod
    handleTableResize() {
        this.checkWidth();
    }

    @boundMethod
    handleItemHover(remoteId: string) {
        this.setState({ hoveredItemId: remoteId });
    }

    @boundMethod
    handleTableHoverLeave() {
        this.setState({ hoveredItemId: null });
    }

    @boundMethod
    getName(item: T.RemoteType) {
        const { remotealias, remotecanonicalname } = item;
        return remotealias ? `${remotealias} [${remotecanonicalname}]` : remotecanonicalname;
    }

    @boundMethod
    getImportSymbol(item: T.RemoteType): React.ReactElement<any, any> {
        const { sshconfigsrc } = item;
        if (sshconfigsrc == "sshconfig-import") {
            return <i title="Connection Imported from SSH Config" className="fa-sharp fa-solid fa-file-import" />;
        } else {
            return <></>;
        }
    }

    @boundMethod
    handleAddConnection(): void {
        GlobalModel.remotesModel.openAddModal({ remoteedit: true });
    }

    @boundMethod
    importSshConfig(): void {
        GlobalCommandRunner.importSshConfig();
    }

    @boundMethod
    handleImportSshConfig(): void {
        let cdata = GlobalModel.clientData.get();
        let { hideShellPrompt } = cdata.clientopts.confirmflags;
        if (hideShellPrompt) {
            this.showShellPrompt(this.importSshConfig);
        } else {
            this.importSshConfig();
        }
    }

    @boundMethod
    showShellPrompt(cb: () => void): void {
        let prtn = GlobalModel.showAlert({
            message:
                "You are about to install WaveShell on a remote machine. Please be aware that WaveShell will be executed on the remote system.",
            confirm: true,
            hideShellPrompt: false,
        });
        prtn.then((confirm) => {
            if (!confirm) {
                return;
            }
            cb();
        });
    }

    @boundMethod
    handleRead(remoteId: string): void {
        GlobalModel.remotesModel.openReadModal(remoteId);
    }

    @boundMethod
    getStatus(status: string) {
        switch (status) {
            case "connected":
                return "green";
            case "disconnected":
                return "gray";
            default:
                return "red";
        }
    }

    componentDidMount() {
        if (this.tableRef.current != null) {
            this.tableRszObs = new ResizeObserver(this.handleTableResize.bind(this));
            this.tableRszObs.observe(this.tableRef.current);
        }
        this.checkWidth();
    }

    componentWillUnmount() {
        if (this.tableRszObs != null) {
            this.tableRszObs.disconnect();
        }
    }

    componentDidUpdate() {
        this.checkWidth();
    }

    render() {
        let isHidden = GlobalModel.activeMainView.get() != "connections";
        if (isHidden) {
            return null;
        }

        let items = util.sortAndFilterRemotes(GlobalModel.remotes.slice());
        let item: T.RemoteType = null;

        return (
            <div className={cn("connections-view")}>
                <header className="header">
                    <div className="connections-title text-primary">Connections</div>
                </header>
                <table
                    className="connections-table"
                    cellSpacing="0"
                    cellPadding="0"
                    border={0}
                    ref={this.tableRef}
                    onMouseLeave={this.handleTableHoverLeave}
                >
                    <colgroup>
                        <col className="first-col" />
                        <col className="second-col" />
                        <col className="third-col" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="text-standard col-name">
                                <div>Name</div>
                            </th>
                            <th className="text-standard col-type">
                                <div>Type</div>
                            </th>
                            <th className="text-standard col-status">
                                <div>Status</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <For index="idx" each="item" of={items}>
                            <tr
                                key={item.remoteid}
                                className={cn("connections-item", {
                                    hovered: this.state.hoveredItemId === item.remoteid,
                                })}
                                onClick={() => this.handleRead(item.remoteid)} // Moved onClick here
                            >
                                <td className="col-name">
                                    <Status status={this.getStatus(item.status)} text=""></Status>
                                    {this.getName(item)}&nbsp;{this.getImportSymbol(item)}
                                </td>
                                <td className="col-type">
                                    <div>{item.remotetype}</div>
                                </td>
                                <td className="col-status">
                                    <div>
                                        <Status status={this.getStatus(item.status)} text={item.status} />
                                    </div>
                                </td>
                            </tr>
                        </For>
                    </tbody>
                </table>
                <footer>
                    <Button
                        theme="secondary"
                        leftIcon={<i className="fa-sharp fa-solid fa-plus"></i>}
                        onClick={this.handleAddConnection}
                    >
                        New Connection
                    </Button>
                    <Button
                        theme="secondary"
                        leftIcon={<i className="fa-sharp fa-solid fa-fw fa-file-import"></i>}
                        onClick={this.handleImportSshConfig}
                    >
                        Import Config
                    </Button>
                </footer>
                <If condition={items.length == 0}>
                    <div className="no-items">
                        <div>No Connections Items Found</div>
                    </div>
                </If>
            </div>
        );
    }
}

export { ConnectionsView };
