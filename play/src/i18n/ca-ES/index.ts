import { deepmerge } from "deepmerge-ts";
import en_US from "../en-US";
import audio from "./audio";
import camera from "./camera";
import chat from "./chat";
import companion from "./companion";
import woka from "./woka";
import error from "./error";
import follow from "./follow";
import login from "./login";
import menu from "./menu";
import report from "./report";
import warning from "./warning";
import trigger from "./trigger";
import notification from "./notification";
import cowebsite from "./cowebsite";
import actionbar from "./actionbar";
import video from "./video";
import form from "./form";
import say from "./say";
import mapEditor from "./mapEditor";
import externalModule from "./externalModule";
import locate from "./locate";
import area from "./area";
import statusModal from "./statusModal";
import messageScreen from "./messageScreen";
import refreshPrompt from "./refreshPrompt";
import megaphone from "./megaphone";
import randomNames from "./randomNames";
import onboarding from "./onboarding";
import recording from "./recording";
import { npcChat } from "./npcChat";
import { shop } from "./shop";
import { gamePanel } from "./gamePanel";
import { trade } from "./trade";

const ca_ES = deepmerge(en_US, {
    shop,
    npcChat,
    gamePanel,
    trade,
    audio,
    camera,
    chat,
    companion,
    woka,
    error,
    follow,
    login,
    menu,
    report,
    warning,
    trigger,
    notification,
    cowebsite,
    actionbar,
    video,
    form,
    say,
    mapEditor,
    externalModule,
    locate,
    area,
    statusModal,
    messageScreen,
    refreshPrompt,
    megaphone,
    randomNames,
    onboarding,
    recording,
});

export default ca_ES;
