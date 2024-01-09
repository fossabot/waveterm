// Copyright 2023, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from "react";
import * as mobxReact from "mobx-react";
import * as mobx from "mobx";
import { boundMethod } from "autobind-decorator";
import { If, For } from "tsx-control-statements/components";
import cn from "classnames";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { GlobalModel, GlobalCommandRunner, RemotesModel } from "../../../model/model";
import * as T from "../../../types/types";
import {
    Markdown,
    Toggle,
    Modal,
    TextField,
    NumberField,
    InputDecoration,
    Dropdown,
    PasswordField,
    Tooltip,
    Button,
    Status,
} from "../common";
import * as util from "../../../util/util";
import * as textmeasure from "../../../util/textmeasure";
import { ClientDataType } from "../../../types/types";
import { Screen } from "../../../model/model";
import { ReactComponent as SquareIcon } from "../../assets/icons/tab/square.svg";

import shield from "../../assets/icons/shield_check.svg";
import help from "../../assets/icons/help_filled.svg";
import github from "../../assets/icons/github.svg";
import logo from "../../assets/waveterm-logo-with-bg.svg";

dayjs.extend(localizedFormat);

// @ts-ignore
const VERSION = __WAVETERM_VERSION__;
// @ts-ignore
let BUILD = __WAVETERM_BUILD__;

type OV<V> = mobx.IObservableValue<V>;
type OArr<V> = mobx.IObservableArray<V>;

const RemotePtyRows = 9;
const RemotePtyCols = 80;
const NumOfLines = 50;
const PasswordUnchangedSentinel = "--unchanged--";

@mobxReact.observer
class LoadingSpinner extends React.Component<{}, {}> {
    render() {
        return (
            <div className="loading-spinner">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        );
    }
}

@mobxReact.observer
class ViewRemoteConnDetailModal extends React.Component<{}, {}> {
    termRef: React.RefObject<any> = React.createRef();
    model: RemotesModel;

    constructor(props: { remotesModel?: RemotesModel }) {
        super(props);
        this.model = GlobalModel.remotesModel;
    }

    @mobx.computed
    get selectedRemote(): T.RemoteType {
        const selectedRemoteId = this.model.selectedRemoteId.get();
        return GlobalModel.getRemote(selectedRemoteId);
    }

    componentDidMount() {
        let elem = this.termRef.current;
        if (elem == null) {
            console.log("ERROR null term-remote element");
            return;
        }
        this.model.createTermWrap(elem);
    }

    componentDidUpdate() {
        if (this.selectedRemote == null || this.selectedRemote.archived) {
            this.model.deSelectRemote();
        }
    }

    componentWillUnmount() {
        this.model.disposeTerm();
    }

    @boundMethod
    clickTermBlock(): void {
        if (this.model.remoteTermWrap != null) {
            this.model.remoteTermWrap.giveFocus();
        }
    }

    getRemoteTypeStr(remote: T.RemoteType): string {
        if (!util.isBlank(remote.uname)) {
            let unameStr = remote.uname;
            unameStr = unameStr.replace("|", ", ");
            return remote.remotetype + " (" + unameStr + ")";
        }
        return remote.remotetype;
    }

    @boundMethod
    connectRemote(remoteId: string) {
        GlobalCommandRunner.connectRemote(remoteId);
    }

    @boundMethod
    disconnectRemote(remoteId: string) {
        GlobalCommandRunner.disconnectRemote(remoteId);
    }

    @boundMethod
    installRemote(remoteId: string) {
        GlobalCommandRunner.installRemote(remoteId);
    }

    @boundMethod
    cancelInstall(remoteId: string) {
        GlobalCommandRunner.installCancelRemote(remoteId);
    }

    @boundMethod
    openEditModal(): void {
        GlobalModel.remotesModel.startEditAuth();
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

    @boundMethod
    clickArchive(): void {
        if (this.selectedRemote && this.selectedRemote.status == "connected") {
            GlobalModel.showAlert({ message: "Cannot delete when connected.  Disconnect and try again." });
            return;
        }
        let prtn = GlobalModel.showAlert({
            message: "Are you sure you want to delete this connection?",
            confirm: true,
        });
        prtn.then((confirm) => {
            if (!confirm) {
                return;
            }
            if (this.selectedRemote) {
                GlobalCommandRunner.archiveRemote(this.selectedRemote.remoteid);
            }
        });
    }

    @boundMethod
    clickReinstall(): void {
        GlobalCommandRunner.installRemote(this.selectedRemote?.remoteid);
    }

    @boundMethod
    handleClose(): void {
        this.model.closeModal();
        this.model.seRecentConnAdded(false);
    }

    renderInstallStatus(remote: T.RemoteType): any {
        let statusStr: string = null;
        if (remote.installstatus == "disconnected") {
            if (remote.needsmshellupgrade) {
                statusStr = "mshell " + remote.mshellversion + " - needs upgrade";
            } else if (util.isBlank(remote.mshellversion)) {
                statusStr = "mshell unknown";
            } else {
                statusStr = "mshell " + remote.mshellversion + " - current";
            }
        } else {
            statusStr = remote.installstatus;
        }
        if (statusStr == null) {
            return null;
        }
        return (
            <div key="install-status" className="settings-field">
                <div className="settings-label"> Install Status</div>
                <div className="settings-input">{statusStr}</div>
            </div>
        );
    }

    renderHeaderBtns(remote: T.RemoteType): React.ReactNode {
        let buttons: React.ReactNode[] = [];
        const disconnectButton = (
            <Button theme="secondary" onClick={() => this.disconnectRemote(remote.remoteid)}>
                Disconnect Now
            </Button>
        );
        const connectButton = (
            <Button theme="secondary" onClick={() => this.connectRemote(remote.remoteid)}>
                Connect Now
            </Button>
        );
        const tryReconnectButton = (
            <Button theme="secondary" onClick={() => this.connectRemote(remote.remoteid)}>
                Try Reconnect
            </Button>
        );
        let updateAuthButton = (
            <Button theme="secondary" onClick={() => this.openEditModal()}>
                Edit
            </Button>
        );
        let cancelInstallButton = (
            <Button theme="secondary" onClick={() => this.cancelInstall(remote.remoteid)}>
                Cancel Install
            </Button>
        );
        let installNowButton = (
            <Button theme="secondary" onClick={() => this.installRemote(remote.remoteid)}>
                Install Now
            </Button>
        );
        let archiveButton = (
            <Button theme="secondary" onClick={() => this.clickArchive()}>
                Delete
            </Button>
        );
        const reinstallButton = (
            <Button theme="secondary" onClick={this.clickReinstall}>
                Reinstall
            </Button>
        );
        if (remote.local) {
            installNowButton = <></>;
            updateAuthButton = <></>;
            cancelInstallButton = <></>;
        }
        if (remote.sshconfigsrc == "sshconfig-import") {
            updateAuthButton = (
                <Button theme="secondary" disabled={true}>
                    Edit
                    <Tooltip
                        message={`Remotes imported from an ssh config file cannot be edited inside waveterm. To edit these, you must edit the config file and import it again.`}
                        icon={<i className="fa-sharp fa-regular fa-fw fa-ban" />}
                    >
                        <i className="fa-sharp fa-regular fa-fw fa-ban" />
                    </Tooltip>
                </Button>
            );
            archiveButton = (
                <Button theme="secondary" onClick={() => this.clickArchive()}>
                    Delete
                    <Tooltip
                        message={
                            <span>
                                Remotes imported from an ssh config file can be deleted, but will come back upon
                                importing again. They will stay removed if you follow{" "}
                                <a href="https://docs.waveterm.dev/features/sshconfig-imports">this procedure</a>.
                            </span>
                        }
                        icon={<i className="fa-sharp fa-regular fa-fw fa-triangle-exclamation" />}
                    >
                        <i className="fa-sharp fa-regular fa-fw fa-triangle-exclamation" />
                    </Tooltip>
                </Button>
            );
        }
        if (remote.status == "connected" || remote.status == "connecting") {
            buttons.push(disconnectButton);
        } else if (remote.status == "disconnected") {
            buttons.push(connectButton);
        } else if (remote.status == "error") {
            if (remote.needsmshellupgrade) {
                if (remote.installstatus == "connecting") {
                    buttons.push(cancelInstallButton);
                } else {
                    buttons.push(installNowButton);
                }
            } else {
                buttons.push(tryReconnectButton);
            }
        }
        buttons.push(reinstallButton);
        buttons.push(updateAuthButton);
        buttons.push(archiveButton);

        let i = 0;
        let button: React.ReactNode = null;

        return (
            <For each="button" of={buttons} index="i">
                <div key={i}>{button}</div>
            </For>
        );
    }

    getMessage(remote: T.RemoteType): string {
        let message = "";
        if (remote.status == "connected") {
            message = "Connected and ready to run commands.";
        } else if (remote.status == "connecting") {
            message = remote.waitingforpassword ? "Connecting, waiting for user-input..." : "Connecting...";
            let connectTimeout = remote.connecttimeout ?? 0;
            message = message + " (" + connectTimeout + "s)";
        } else if (remote.status == "disconnected") {
            message = "Disconnected";
        } else if (remote.status == "error") {
            if (remote.noinitpk) {
                message = "Error, could not connect.";
            } else if (remote.needsmshellupgrade) {
                if (remote.installstatus == "connecting") {
                    message = "Installing...";
                } else {
                    message = "Error, needs install.";
                }
            } else {
                message = "Error";
            }
        }

        return message;
    }

    render() {
        let remote = this.selectedRemote;

        if (remote == null) {
            return null;
        }

        let model = this.model;
        let isTermFocused = this.model.remoteTermWrapFocus.get();
        let termFontSize = GlobalModel.termFontSize.get();
        let termWidth = textmeasure.termWidthFromCols(RemotePtyCols, termFontSize);
        let remoteAliasText = util.isBlank(remote.remotealias) ? "(none)" : remote.remotealias;

        return (
            <Modal className="rconndetail-modal">
                <Modal.Header title="Connection" onClose={this.model.closeModal} />
                <div className="wave-modal-body">
                    <div className="name-header-actions-wrapper">
                        <div className="name text-primary name-wrapper">
                            {util.getRemoteName(remote)}&nbsp; {getImportTooltip(remote)}
                        </div>
                        <div className="header-actions">{this.renderHeaderBtns(remote)}</div>
                    </div>
                    <div className="remote-detail" style={{ overflow: "hidden" }}>
                        <div className="settings-field">
                            <div className="settings-label">Conn Id</div>
                            <div className="settings-input">{remote.remoteid}</div>
                        </div>
                        <div className="settings-field">
                            <div className="settings-label">Type</div>
                            <div className="settings-input">{this.getRemoteTypeStr(remote)}</div>
                        </div>
                        <div className="settings-field">
                            <div className="settings-label">Canonical Name</div>
                            <div className="settings-input">
                                {remote.remotecanonicalname}
                                <If condition={!util.isBlank(remote.remotevars.port) && remote.remotevars.port != "22"}>
                                    <span style={{ marginLeft: 5 }}>(port {remote.remotevars.port})</span>
                                </If>
                            </div>
                        </div>
                        <div className="settings-field" style={{ minHeight: 24 }}>
                            <div className="settings-label">Alias</div>
                            <div className="settings-input">{remoteAliasText}</div>
                        </div>
                        <div className="settings-field">
                            <div className="settings-label">Auth Type</div>
                            <div className="settings-input">
                                <If condition={!remote.local}>{remote.authtype}</If>
                                <If condition={remote.local}>local</If>
                            </div>
                        </div>
                        <div className="settings-field">
                            <div className="settings-label">Connect Mode</div>
                            <div className="settings-input">{remote.connectmode}</div>
                        </div>
                        {this.renderInstallStatus(remote)}
                        <div className="flex-spacer" style={{ minHeight: 20 }} />
                        <div className="status">
                            <Status status={this.getStatus(remote.status)} text={this.getMessage(remote)} />
                        </div>
                        <div
                            key="term"
                            className={cn(
                                "terminal-wrapper",
                                { focus: isTermFocused },
                                remote != null ? "status-" + remote.status : null
                            )}
                        >
                            <If condition={!isTermFocused}>
                                <div key="termblock" className="term-block" onClick={this.clickTermBlock}></div>
                            </If>
                            <If condition={model.showNoInputMsg.get()}>
                                <div key="termtag" className="term-tag">
                                    input is only allowed while status is 'connecting'
                                </div>
                            </If>
                            <div
                                key="terminal"
                                className="terminal-connectelem"
                                ref={this.termRef}
                                data-remoteid={remote.remoteid}
                                style={{
                                    height: textmeasure.termHeightFromRows(RemotePtyRows, termFontSize),
                                    width: termWidth,
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
                <Modal.Footer onOk={this.model.closeModal} onCancel={this.model.closeModal} okLabel="Done" />
            </Modal>
        );
    }
}

@mobxReact.observer
class EditRemoteConnModal extends React.Component<{}, {}> {
    tempAlias: OV<string>;
    tempKeyFile: OV<string>;
    tempPassword: OV<string>;
    tempConnectMode: OV<string>;
    tempAuthMode: OV<string>;
    model: RemotesModel;

    constructor(props: { remotesModel?: RemotesModel }) {
        super(props);
        this.model = GlobalModel.remotesModel;
        this.tempAlias = mobx.observable.box(null, { name: "EditRemoteSettings-tempAlias" });
        this.tempAuthMode = mobx.observable.box(null, { name: "EditRemoteSettings-tempAuthMode" });
        this.tempKeyFile = mobx.observable.box(null, { name: "EditRemoteSettings-tempKeyFile" });
        this.tempPassword = mobx.observable.box(null, { name: "EditRemoteSettings-tempPassword" });
        this.tempConnectMode = mobx.observable.box(null, { name: "EditRemoteSettings-tempConnectMode" });
    }

    get selectedRemoteId() {
        return this.model.selectedRemoteId.get();
    }

    get selectedRemote(): T.RemoteType {
        return GlobalModel.getRemote(this.selectedRemoteId);
    }

    get remoteEdit(): T.RemoteEditType {
        return this.model.remoteEdit.get();
    }

    get isAuthEditMode(): boolean {
        return this.model.isAuthEditMode();
    }

    componentDidMount(): void {
        mobx.action(() => {
            this.tempAlias.set(this.selectedRemote?.remotealias);
            this.tempKeyFile.set(this.remoteEdit?.keystr);
            this.tempPassword.set(this.remoteEdit?.haspassword ? PasswordUnchangedSentinel : "");
            this.tempConnectMode.set(this.selectedRemote?.connectmode);
            this.tempAuthMode.set(this.selectedRemote?.authtype);
        })();
    }

    componentDidUpdate() {
        if (this.selectedRemote == null || this.selectedRemote.archived) {
            this.model.deSelectRemote();
        }
    }

    @boundMethod
    handleChangeKeyFile(value: string): void {
        mobx.action(() => {
            this.tempKeyFile.set(value);
        })();
    }

    @boundMethod
    handleChangePassword(value: string): void {
        mobx.action(() => {
            this.tempPassword.set(value);
        })();
    }

    @boundMethod
    handleChangeAlias(value: string): void {
        mobx.action(() => {
            this.tempAlias.set(value);
        })();
    }

    @boundMethod
    handleChangeAuthMode(value: string): void {
        mobx.action(() => {
            this.tempAuthMode.set(value);
        })();
    }

    @boundMethod
    handleChangeConnectMode(value: string): void {
        mobx.action(() => {
            this.tempConnectMode.set(value);
        })();
    }

    @boundMethod
    canResetPw(): boolean {
        if (this.remoteEdit == null) {
            return false;
        }
        return Boolean(this.remoteEdit.haspassword) && this.tempPassword.get() != PasswordUnchangedSentinel;
    }

    @boundMethod
    resetPw(): void {
        mobx.action(() => {
            this.tempPassword.set(PasswordUnchangedSentinel);
        })();
    }

    @boundMethod
    onFocusPassword(e: any) {
        if (this.tempPassword.get() == PasswordUnchangedSentinel) {
            e.target.select();
        }
    }

    @boundMethod
    submitRemote(): void {
        let authMode = this.tempAuthMode.get();
        let kwargs: Record<string, string> = {};
        if (authMode == "key" || authMode == "key+password") {
            let keyStrEq = util.isStrEq(this.tempKeyFile.get(), this.remoteEdit?.keystr);
            if (!keyStrEq) {
                kwargs["key"] = this.tempKeyFile.get();
            }
        } else {
            if (!util.isBlank(this.tempKeyFile.get())) {
                kwargs["key"] = "";
            }
        }
        if (authMode == "password" || authMode == "key+password") {
            if (this.tempPassword.get() != PasswordUnchangedSentinel) {
                kwargs["password"] = this.tempPassword.get();
            }
        } else {
            if (this.remoteEdit?.haspassword) {
                kwargs["password"] = "";
            }
        }
        if (!util.isStrEq(this.tempAlias.get(), this.selectedRemote?.remotealias)) {
            kwargs["alias"] = this.tempAlias.get();
        }
        if (!util.isStrEq(this.tempConnectMode.get(), this.selectedRemote?.connectmode)) {
            kwargs["connectmode"] = this.tempConnectMode.get();
        }
        kwargs["visual"] = "1";
        kwargs["submit"] = "1";
        GlobalCommandRunner.editRemote(this.selectedRemote?.remoteid, kwargs);
        this.model.closeModal();
    }

    renderAuthModeMessage(): any {
        let authMode = this.tempAuthMode.get();
        if (authMode == "none") {
            return (
                <span>
                    This connection requires no authentication.
                    <br />
                    Or authentication is already configured in ssh_config.
                </span>
            );
        }
        if (authMode == "key") {
            return <span>Use a public/private keypair.</span>;
        }
        if (authMode == "password") {
            return <span>Use a password.</span>;
        }
        if (authMode == "key+password") {
            return <span>Use a public/private keypair with a passphrase.</span>;
        }
        return null;
    }

    render() {
        let authMode = this.tempAuthMode.get();
        if (this.remoteEdit === null || !this.isAuthEditMode) {
            return null;
        }
        return (
            <Modal className="erconn-modal">
                <Modal.Header title="Edit Connection" onClose={this.model.closeModal} />
                <div className="wave-modal-body">
                    <div className="name-actions-section">
                        <div className="name text-primary">{util.getRemoteName(this.selectedRemote)}</div>
                    </div>
                    <div className="alias-section">
                        <TextField
                            label="Alias"
                            onChange={this.handleChangeAlias}
                            value={this.tempAlias.get()}
                            maxLength={100}
                            decoration={{
                                endDecoration: (
                                    <InputDecoration>
                                        <Tooltip
                                            message={`(Optional) A short alias to use when selecting or displaying this connection.`}
                                            icon={<i className="fa-sharp fa-regular fa-circle-question" />}
                                        >
                                            <i className="fa-sharp fa-regular fa-circle-question" />
                                        </Tooltip>
                                    </InputDecoration>
                                ),
                            }}
                        />
                    </div>
                    <div className="authmode-section">
                        <Dropdown
                            label="Auth Mode"
                            options={[
                                { value: "none", label: "none" },
                                { value: "key", label: "key" },
                                { value: "password", label: "password" },
                                { value: "key+password", label: "key+password" },
                            ]}
                            value={this.tempAuthMode.get()}
                            onChange={this.handleChangeAuthMode}
                            decoration={{
                                endDecoration: (
                                    <InputDecoration>
                                        <Tooltip
                                            message={
                                                <ul>
                                                    <li>
                                                        <b>none</b> - no authentication, or authentication is already
                                                        configured in your ssh config.
                                                    </li>
                                                    <li>
                                                        <b>key</b> - use a private key.
                                                    </li>
                                                    <li>
                                                        <b>password</b> - use a password.
                                                    </li>
                                                    <li>
                                                        <b>key+password</b> - use a key with a passphrase.
                                                    </li>
                                                </ul>
                                            }
                                            icon={<i className="fa-sharp fa-regular fa-circle-question" />}
                                        >
                                            <i className="fa-sharp fa-regular fa-circle-question" />
                                        </Tooltip>
                                    </InputDecoration>
                                ),
                            }}
                        />
                    </div>
                    <If condition={authMode == "key" || authMode == "key+password"}>
                        <TextField
                            label="SSH Keyfile"
                            placeholder="keyfile path"
                            onChange={this.handleChangeKeyFile}
                            value={this.tempKeyFile.get()}
                            maxLength={400}
                            required={true}
                            decoration={{
                                endDecoration: (
                                    <InputDecoration>
                                        <Tooltip
                                            message={`(Required) The path to your ssh key file.`}
                                            icon={<i className="fa-sharp fa-regular fa-circle-question" />}
                                        >
                                            <i className="fa-sharp fa-regular fa-circle-question" />
                                        </Tooltip>
                                    </InputDecoration>
                                ),
                            }}
                        />
                    </If>
                    <If condition={authMode == "password" || authMode == "key+password"}>
                        <PasswordField
                            label={authMode == "password" ? "SSH Password" : "Key Passphrase"}
                            placeholder="password"
                            onChange={this.handleChangePassword}
                            value={this.tempPassword.get()}
                            maxLength={400}
                        />
                    </If>
                    <div className="connectmode-section">
                        <Dropdown
                            label="Connect Mode"
                            options={[
                                { value: "startup", label: "startup" },
                                { value: "auto", label: "auto" },
                                { value: "manual", label: "manual" },
                            ]}
                            value={this.tempConnectMode.get()}
                            onChange={this.handleChangeConnectMode}
                        />
                    </div>
                    <If condition={!util.isBlank(this.remoteEdit?.errorstr)}>
                        <div className="settings-field settings-error">Error: {this.remoteEdit?.errorstr}</div>
                    </If>
                </div>
                <Modal.Footer onOk={this.submitRemote} onCancel={this.model.closeModal} okLabel="Save" />
            </Modal>
        );
    }
}

type SwitcherDataType = {
    sessionId: string;
    sessionName: string;
    sessionIdx: number;
    screenId: string;
    screenIdx: number;
    screenName: string;
    icon: string;
    color: string;
};

const MaxOptionsToDisplay = 100;

@mobxReact.observer
class TabSwitcherModal extends React.Component<{}, {}> {
    screens: Map<string, OV<string>>[];
    sessions: Map<string, OV<string>>[];
    options: SwitcherDataType[] = [];
    sOptions: OArr<SwitcherDataType> = mobx.observable.array(null, {
        name: "TabSwitcherModal-sOptions",
    });
    focusedIdx: OV<number> = mobx.observable.box(0, { name: "TabSwitcherModal-selectedIdx" });
    activeSessionIdx: number;
    optionRefs = [];
    listWrapperRef = React.createRef<HTMLDivElement>();
    prevFocusedIdx = 0;

    componentDidMount() {
        this.activeSessionIdx = GlobalModel.getActiveSession().sessionIdx.get();
        let oSessions = GlobalModel.sessionList;
        let oScreens = GlobalModel.screenMap;
        oScreens.forEach((oScreen) => {
            // Find the matching session in the observable array
            let foundSession = oSessions.find((s) => {
                if (s.sessionId === oScreen.sessionId && s.archived.get() == false) {
                    return true;
                }
                return false;
            });

            if (foundSession) {
                let data: SwitcherDataType = {
                    sessionName: foundSession.name.get(),
                    sessionId: foundSession.sessionId,
                    sessionIdx: foundSession.sessionIdx.get(),
                    screenName: oScreen.name.get(),
                    screenId: oScreen.screenId,
                    screenIdx: oScreen.screenIdx.get(),
                    icon: this.getTabIcon(oScreen),
                    color: this.getTabColor(oScreen),
                };
                this.options.push(data);
            }
        });

        mobx.action(() => {
            this.sOptions.replace(this.sortOptions(this.options).slice(0, MaxOptionsToDisplay));
        })();

        document.addEventListener("keydown", this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.handleKeyDown);
    }

    componentDidUpdate() {
        let currFocusedIdx = this.focusedIdx.get();

        // Check if selectedIdx has changed
        if (currFocusedIdx !== this.prevFocusedIdx) {
            let optionElement = this.optionRefs[currFocusedIdx]?.current;

            if (optionElement) {
                optionElement.scrollIntoView({ block: "nearest" });
            }

            // Update prevFocusedIdx for the next update cycle
            this.prevFocusedIdx = currFocusedIdx;
        }
        if (currFocusedIdx >= this.sOptions.length && this.sOptions.length > 0) {
            this.setFocusedIndex(this.sOptions.length - 1);
        }
    }

    @boundMethod
    getTabIcon(screen: Screen): string {
        let tabIcon = "default";
        let screenOpts = screen.opts.get();
        if (screenOpts != null && !util.isBlank(screenOpts.tabicon)) {
            tabIcon = screenOpts.tabicon;
        }
        return tabIcon;
    }

    @boundMethod
    getTabColor(screen: Screen): string {
        let tabColor = "default";
        let screenOpts = screen.opts.get();
        if (screenOpts != null && !util.isBlank(screenOpts.tabcolor)) {
            tabColor = screenOpts.tabcolor;
        }
        return tabColor;
    }

    @boundMethod
    handleKeyDown(e) {
        if (e.key === "Escape") {
            this.closeModal();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            let newIndex = this.calculateNewIndex(e.key === "ArrowUp");
            this.setFocusedIndex(newIndex);
        } else if (e.key === "Enter") {
            e.preventDefault();
            this.handleSelect(this.focusedIdx.get());
        }
    }

    @boundMethod
    calculateNewIndex(isUpKey) {
        let currentIndex = this.focusedIdx.get();
        if (isUpKey) {
            return Math.max(currentIndex - 1, 0);
        } else {
            return Math.min(currentIndex + 1, this.sOptions.length - 1);
        }
    }

    @boundMethod
    setFocusedIndex(index) {
        mobx.action(() => {
            this.focusedIdx.set(index);
        })();
    }

    @boundMethod
    closeModal(): void {
        GlobalModel.modalsModel.popModal();
    }

    @boundMethod
    handleSelect(index: number): void {
        const selectedOption = this.sOptions[index];
        if (selectedOption) {
            GlobalCommandRunner.switchScreen(selectedOption.screenId, selectedOption.sessionId);
            this.closeModal();
        }
    }

    @boundMethod
    handleSearch(val: string): void {
        let sOptions: SwitcherDataType[];
        if (val == "") {
            sOptions = this.sortOptions(this.options).slice(0, MaxOptionsToDisplay);
        } else {
            sOptions = this.filterOptions(val);
            sOptions = this.sortOptions(sOptions);
            if (sOptions.length > MaxOptionsToDisplay) {
                sOptions = sOptions.slice(0, MaxOptionsToDisplay);
            }
        }
        mobx.action(() => {
            this.sOptions.replace(sOptions);
            this.focusedIdx.set(0);
        })();
    }

    @mobx.computed
    @boundMethod
    filterOptions(searchInput: string): SwitcherDataType[] {
        let filteredScreens = [];

        for (let i = 0; i < this.options.length; i++) {
            let tab = this.options[i];
            let match = false;

            if (searchInput.includes("/")) {
                let [sessionFilter, screenFilter] = searchInput.split("/").map((s) => s.trim().toLowerCase());
                match =
                    tab.sessionName.toLowerCase().includes(sessionFilter) &&
                    tab.screenName.toLowerCase().includes(screenFilter);
            } else {
                match =
                    tab.sessionName.toLowerCase().includes(searchInput) ||
                    tab.screenName.toLowerCase().includes(searchInput);
            }

            // Add tab to filtered list if it matches the criteria
            if (match) {
                filteredScreens.push(tab);
            }
        }

        return filteredScreens;
    }

    @mobx.computed
    @boundMethod
    sortOptions(options: SwitcherDataType[]): SwitcherDataType[] {
        return options.sort((a, b) => {
            let aInCurrentSession = a.sessionIdx === this.activeSessionIdx;
            let bInCurrentSession = b.sessionIdx === this.activeSessionIdx;

            // Tabs in the current session are sorted by screenIdx
            if (aInCurrentSession && bInCurrentSession) {
                return a.screenIdx - b.screenIdx;
            }
            // a is in the current session and b is not, so a comes first
            else if (aInCurrentSession) {
                return -1;
            }
            // b is in the current session and a is not, so b comes first
            else if (bInCurrentSession) {
                return 1;
            }
            // Both are in different, non-current sessions - sort by sessionIdx and then by screenIdx
            else {
                if (a.sessionIdx === b.sessionIdx) {
                    return a.screenIdx - b.screenIdx;
                } else {
                    return a.sessionIdx - b.sessionIdx;
                }
            }
        });
    }

    @boundMethod
    renderIcon(option: SwitcherDataType): React.ReactNode {
        let tabIcon = option.icon;
        if (tabIcon === "default" || tabIcon === "square") {
            return <SquareIcon className="left-icon" />;
        }
        return <i className={`fa-sharp fa-solid fa-${tabIcon}`}></i>;
    }

    @boundMethod
    renderOption(option: SwitcherDataType, index: number): JSX.Element {
        if (!this.optionRefs[index]) {
            this.optionRefs[index] = React.createRef();
        }
        return (
            <div
                key={option.sessionId + "/" + option.screenId}
                ref={this.optionRefs[index]}
                className={cn("search-option unselectable", {
                    "focused-option": this.focusedIdx.get() === index,
                })}
                onClick={() => this.handleSelect(index)}
            >
                <div className={cn("icon", "color-" + option.color)}>{this.renderIcon(option)}</div>
                <div className="tabname">
                    #{option.sessionName} / {option.screenName}
                </div>
            </div>
        );
    }

    render() {
        let option: SwitcherDataType;
        let index: number;
        return (
            <Modal className="tabswitcher-modal">
                <div className="wave-modal-body">
                    <div className="textfield-wrapper">
                        <TextField
                            onChange={this.handleSearch}
                            maxLength={400}
                            autoFocus={true}
                            decoration={{
                                startDecoration: (
                                    <InputDecoration position="start">
                                        <div className="tabswitcher-search-prefix">Switch to Tab:</div>
                                    </InputDecoration>
                                ),
                                endDecoration: (
                                    <InputDecoration>
                                        <Tooltip
                                            message={`Type to filter workspaces and tabs.`}
                                            icon={<i className="fa-sharp fa-regular fa-circle-question" />}
                                        >
                                            <i className="fa-sharp fa-regular fa-circle-question" />
                                        </Tooltip>
                                    </InputDecoration>
                                ),
                            }}
                        />
                    </div>
                    <div className="list-container">
                        <div ref={this.listWrapperRef} className="list-container-inner">
                            <div className="options-list">
                                <For each="option" index="index" of={this.sOptions}>
                                    {this.renderOption(option, index)}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }
}

const getImportTooltip = (remote: T.RemoteType): React.ReactElement<any, any> => {
    if (remote.sshconfigsrc == "sshconfig-import") {
        return (
            <Tooltip
                message={`This remote was imported from an SSH config file.`}
                icon={<i className="fa-sharp fa-solid fa-file-import" />}
            >
                <i className="fa-sharp fa-solid fa-file-import" />
            </Tooltip>
        );
    } else {
        return <></>;
    }
};

export { LoadingSpinner, ViewRemoteConnDetailModal, EditRemoteConnModal, TabSwitcherModal };
