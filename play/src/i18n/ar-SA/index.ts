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
import refreshPrompt from "./refreshPrompt";
import warning from "./warning";
import trigger from "./trigger";
import notification from "./notification";
import cowebsite from "./cowebsite";
import actionbar from "./actionbar";
import mapEditor from "./mapEditor";
import megaphone from "./megaphone";
import video from "./video";
import statusModal from "./statusModal";
import area from "./area";
import externalModule from "./externalModule";
import form from "./form";
import messageScreen from "./messageScreen";
import say from "./say";
import locate from "./locate";
import randomNames from "./randomNames";
import onboarding from "./onboarding";
import recording from "./recording";
import { npcChat } from "./npcChat";
import { shop } from "./shop";
import { gamePanel } from "./gamePanel";
import { trade } from "./trade";

const ar_SA = deepmerge(en_US, {
    shop,
    npcChat,
    gamePanel,
    trade,
    area,
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
    refreshPrompt,
    warning,
    trigger,
    notification,
    cowebsite,
    actionbar,
    mapEditor,
    megaphone,
    video,
    statusModal,
    externalModule,
    form,
    messageScreen,
    say,
    locate,
    randomNames,
    onboarding,
    recording,
});

export default ar_SA;
