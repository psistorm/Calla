﻿// TODO
// use gamepad manager
// provide gamepad axis binding selector

import { Game } from "./Game.js";
import { ToolBar } from "./forms/ToolBar.js";
import { OptionsForm } from "./forms/OptionsForm.js";
import { EmojiForm } from "./forms/EmojiForm.js";
import { LoginForm } from "./forms/LoginForm.js";
import { InstructionsForm } from "./forms/InstructionsForm.js";
import { Settings } from "./Settings.js";

export function init(host, JitsiClientClass) {
    const game = new Game(),
        login = new LoginForm(),
        client = new JitsiClientClass(),
        toolbar = new ToolBar(),
        options = new OptionsForm(),
        emoji = new EmojiForm(),
        instructions = new InstructionsForm(),
        settings = new Settings(),
        forExport = {
            client,
            game,
            toolbar,
            options,
            emoji,
            login,
            instructions,
            settings
        };

    for (let e of Object.values(forExport)) {
        if (e.element) {
            document.body.append(e.element);
        }
    }

    refreshGamepads();

    options.drawHearing = game.drawHearing = settings.drawHearing;
    options.audioDistanceMin = game.audioDistanceMin = settings.audioDistanceMin;
    options.audioDistanceMax = game.audioDistanceMax = settings.audioDistanceMax;
    options.audioRolloff = settings.audioRolloff;
    options.fontSize = game.fontSize = settings.fontSize;
    options.gamepadIndex = game.gamepadIndex = settings.gamepadIndex;
    options.inputBinding = game.inputBinding = settings.inputBinding;
    toolbar.zoom = game.cameraZ = game.targetCameraZ = settings.zoom;
    login.userName = settings.userName;
    login.roomName = settings.roomName;

    showLogin();

    function showLogin() {
        client.hide();
        game.hide();
        toolbar.hide();
        options.hide();
        emoji.hide();
        instructions.hide();
        login.show();
    }

    async function withEmojiSelection(callback) {
        if (!emoji.isOpen()) {
            toolbar.optionsButton.lock();
            toolbar.instructionsButton.lock();
            options.hide();
            instructions.hide();
            const e = await emoji.selectAsync();
            if (!!e) {
                callback(e);
            }
            toolbar.optionsButton.unlock();
            toolbar.instructionsButton.unlock();
        }
    }

    async function selectEmojiAsync() {
        await withEmojiSelection((e) => {
            game.emote(client.localUser, e);
            toolbar.setEmojiButton(game.keyEmote, e);
        });
    }

    function setAudioProperties() {
        client.setAudioProperties(
            window.location.origin,
            0.125,
            settings.audioDistanceMin = game.audioDistanceMin = options.audioDistanceMin,
            settings.audioDistanceMax = game.audioDistanceMax = options.audioDistanceMax,
            settings.audioRolloff = options.audioRolloff);
    }

    function refreshGamepads() {
        options.gamepads = [...navigator.getGamepads()]
            .filter(g => g !== null);
    }


    window.addEventListener("resize", () => {
        game.resize(toolbar.offsetHeight);
        client.resize(toolbar.offsetHeight);
    });

    window.addEventListener("gamepadconnected", refreshGamepads);
    window.addEventListener("gamepaddisconnected", refreshGamepads);

    toolbar.addEventListener("selectemoji", selectEmojiAsync);

    toolbar.addEventListener("toggleaudio", () => {
        client.toggleAudio();
    });

    toolbar.addEventListener("leave", () => {
        game.end();
    });

    toolbar.addEventListener("emote", () => {
        game.emote(client.localUser, game.currentEmoji);
    });

    toolbar.addEventListener("zoomchanged", () => {
        settings.zoom = game.targetCameraZ = toolbar.zoom;
    });

    toolbar.addEventListener("tweet", () => {
        const message = encodeURIComponent(`Join my #TeleParty ${document.location.href}`),
            url = new URL("https://twitter.com/intent/tweet?text=" + message);
        open(url);
    });

    toolbar.addEventListener("toggleui", () => {
        game.setOpen(toolbar.visible);
        game.resize(toolbar.offsetHeight);
        client.resize(toolbar.offsetHeight);
    });

    toolbar.addEventListener("toggleoptions", () => {
        if (!emoji.isOpen()) {
            instructions.hide();
            options.toggleOpen();
        }
    });

    toolbar.addEventListener("toggleinstructions", () => {
        if (!emoji.isOpen()) {
            options.hide();
            instructions.toggleOpen();
        }
    });


    login.addEventListener("login", () => {
        client.joinAsync(
            host,
            settings.roomName = login.roomName,
            settings.userName = login.userName);
    });


    options.addEventListener("selectavatar", async () => {
        withEmojiSelection((e) => {
            game.me.avatarEmoji = e;
            options.setAvatarEmoji(e);
            client.setAvatarEmoji(e);
        });
    });

    options.addEventListener("avatarurlchanged", () => {
        client.setAvatarURL(options.avatarURL);
    });

    options.addEventListener("audiopropschanged", setAudioProperties);

    options.addEventListener("togglevideo", () => {
        client.toggleVideo();
    });

    options.addEventListener("toggledrawhearing", () => {
        settings.drawHearing = game.drawHearing = options.drawHearing;
    });

    options.addEventListener("fontsizechanged", () => {
        settings.fontSize = game.fontSize = options.fontSize;
    });

    options.addEventListener("audioinputchanged", () => {
        client.setAudioInputDevice(options.currentAudioInputDevice);
    });

    options.addEventListener("audiooutputchanged", () => {
        client.setAudioOutputDevice(options.currentAudioOutputDevice);
    });

    options.addEventListener("videoinputchanged", () => {
        client.setVideoInputDevice(options.currentVideoInputDevice);
    });

    options.addEventListener("gamepadchanged", () => {
        settings.gamepadIndex = game.gamepadIndex = options.gamepadIndex;
    });

    options.addEventListener("inputbindingchanged", () => {
        settings.inputBinding = game.inputBinding = options.inputBinding;
    });

    game.addEventListener("emote", (evt) => {
        client.emote(evt.emoji);
    });

    game.addEventListener("userjoined", (evt) => {
        evt.user.addEventListener("userPositionNeeded", (evt2) => {
            client.userInitRequest(evt2.id);
        });
    });

    game.addEventListener("toggleaudio", async (evt) => {
        client.toggleAudio();
    });

    game.addEventListener("togglevideo", async (evt) => {
        client.toggleVideo();
    });

    game.addEventListener("gamestarted", () => {
        game.me.addEventListener("userMoved", (evt) => {
            client.setPosition(evt);
        });
        setAudioProperties();
        login.hide();
        toolbar.show();
        client.show();
        client.setPosition(game.me);
        options.setAvatarEmoji(game.me.avatarEmoji);
    });

    game.addEventListener("gameended", () => {
        game.hide();
        client.hide();
        login.connected = false;
        showLogin();
    });

    game.addEventListener("emojineeded", selectEmojiAsync);

    game.addEventListener("zoomchanged", () => {
        settings.zoom = toolbar.zoom = game.targetCameraZ;
    });

    client.addEventListener("videoConferenceJoined", async (evt) => {
        login.connected = true;

        game.start(evt);
        for (let user of client.otherUsers.entries()) {
            game.addUser({
                id: user[0],
                displayName: user[1]
            });
        }

        options.audioInputDevices = await client.getAudioInputDevices();
        options.audioOutputDevices = await client.getAudioOutputDevices();
        options.videoInputDevices = await client.getVideoInputDevices();

        options.currentAudioInputDevice = await client.getCurrentAudioInputDevice();
        options.currentAudioOutputDevice = await client.getCurrentAudioOutputDevice();
        options.currentVideoInputDevice = await client.getCurrentVideoInputDevice();

        const audioMuted = await client.isAudioMutedAsync();
        game.muteUserAudio({ id: client.localUser, muted: audioMuted });
        toolbar.audioEnabled = !audioMuted;

        const videoMuted = await client.isVideoMutedAsync();
        game.muteUserVideo({ id: client.localUser, muted: videoMuted });
        options.videoEnabled = !videoMuted;
    });

    client.addEventListener("videoConferenceLeft", (evt) => {
        if (evt.roomName.toLowerCase() === game.currentRoomName) {
            game.end();
        }
    });

    client.addEventListener("participantJoined", (evt) => {
        game.addUser(evt);
    });

    client.addEventListener("participantLeft", (evt) => {
        game.removeUser(evt);
        client.removeUser(evt);
    });

    client.addEventListener("avatarChanged", (evt) => {
        game.setAvatarURL(evt);
    });

    client.addEventListener("displayNameChange", (evt) => {
        game.changeUserName(evt);
    });

    client.addEventListener("audioMuteStatusChanged", (evt) => {
        game.muteUserAudio(evt);
        if (evt.id === client.localUser) {
            toolbar.audioEnabled = !evt.muted;
        }
    });

    client.addEventListener("videoMuteStatusChanged", (evt) => {
        game.muteUserVideo(evt);
        if (evt.id === client.localUser) {
            options.videoEnabled = !evt.muted;
        }
    });

    client.addEventListener("userInitRequest", (evt) => {
        client.userInitResponse(evt.id, game.me);
    });

    client.addEventListener("userInitResponse", (evt) => {
        const user = game.userLookup[evt.id];
        if (!!user) {
            user.init(evt);
            client.setPosition(evt);
        }
    });

    client.addEventListener("userMoved", (evt) => {
        const user = game.userLookup[evt.id];
        if (!!user) {
            user.moveTo(evt.x, evt.y);
            client.setPosition(evt);
        }
    });

    client.addEventListener("emote", (evt) => {
        game.emote(evt.id, evt);
    });

    client.addEventListener("setAvatarEmoji", (evt) => {
        game.setAvatarEmoji(evt);
    });

    client.addEventListener("audioActivity", (evt) => {
        game.updateAudioActivity(evt);
    });

    client.addEventListener("avatarChanged", (evt) => {
        options.avatarURL = evt.avatarURL;
        game.me.setAvatarURL(evt.avatarURL);
    });

    login.ready = true;
    return forExport;
}