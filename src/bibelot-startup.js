const BIBLT = {
    SCOPE: "bibelot",
    ENTER: "enter",
    LEAVE: "leave",
    MOVE: "move",
    LOG_PREFIX: "Bibelot | ",
    SETTING_PLACEBO: "placebo",
};


class Bibelot {
    constructor() {
        game.settings.register(BIBLT.SCOPE, BIBLT.SETTING_PLACEBO, {
            name: game.i18n.localize("BIBLT.SettingPlacebo"),
            hint: game.i18n.localize("BIBLT.SettingPlaceboHint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true
        });

        // Test if another module is active for conditional code
        // game.modules.get(moduleName)?.active


        Hooks.on("ready", this._onReady.bind(this));
        // Hooks.on("createScene", this.refreshAll.bind(this));
        // Hooks.on("updateScene", this._onUpdateScene.bind(this));
        // Hooks.on("deleteScene", this.refreshAll.bind(this));
        // Hooks.on("createDrawing", this._onCreateDrawing.bind(this));
        // Hooks.on("preUpdateDrawing", this._onPreUpdateDrawing.bind(this));
        // Hooks.on("updateDrawing", this._onUpdateDrawing.bind(this));
        // Hooks.on("deleteDrawing", this._onDeleteDrawing.bind(this));
        // Hooks.on("preCreateToken", this._onPreCreateToken.bind(this));
        // Hooks.on("createToken", this._onCreateToken.bind(this));
        // Hooks.on("preUpdateToken", this._onPreUpdateToken.bind(this));
        // Hooks.on("updateToken", this._onUpdateToken.bind(this));
        // Hooks.on("controlToken", this._onControlToken.bind(this));
        // Hooks.on("preDeleteToken", this._onPreDeleteToken.bind(this));
        // Hooks.on("deleteToken", this._onDeleteToken.bind(this));
        // Hooks.on("targetToken", this._onTargetToken.bind(this));
        // Hooks.on("hoverNote", this._onHoverNote.bind(this));
        // Hooks.on("preCreateCombatant", this._onPreCreateCombatant.bind(this));
        // Hooks.on("chatMessage", this._onChatMessage.bind(this));
        // Hooks.on("createChatMessage", this._onCreateChatMessage.bind(this));
        // Hooks.on("renderDrawingConfig", this._onRenderDrawingConfig.bind(this));
        this._lastMacro = {};
        this._chatMacroSpeaker = null;
        this._asyncQueue = null;
        this._asyncCount = 0;
        this._overrideNotesDisplay = false;
        console.log(BIBLT.LOG_PREFIX, "Initialized");
    }

    _onReady() {
        // Replications might be out of sync if there was previously no GM and we just logged in.
        if (this._isOnlyGamemaster()) {
            this.refreshAll();
        }

        // CONFIG.DND5E.spellSchools['voi'] = 'Void Magic';  // Monkey patch DND5E data

        if (game.user.isGM) {
            // this._initializeLastTeleportAndMacroTracking();
            game.socket.on(`module.${BIBLT.SCOPE}`, this._onSocket.bind(this));
        }
    }

    _isUserGamemaster(userId) {
        const user = game.users.get(userId);
        return user ? user.role === CONST.USER_ROLES.GAMEMASTER : true;
    }

    _getActiveGamemasters() {
        return game.users
            .filter(user => user.active && user.role === CONST.USER_ROLES.GAMEMASTER)
            .map(user => user.id)
            .sort();
    }

    _isOnlyGamemaster() {
        if (!game.user.isGM) {
            return false;
        }
        const activeGamemasters = this._getActiveGamemasters();
        return activeGamemasters.length === 1 && activeGamemasters[0] === game.user.id;
    }

    _isPrimaryGamemaster() {
        // To ensure commands are only issued once, return true only if we are the
        // _first_ active GM.
        if (!game.user.isGM) {
            return false;
        }
        const activeGamemasters = this._getActiveGamemasters();
        return activeGamemasters.length > 0 && activeGamemasters[0] === game.user.id;
    }


    // _getClosestSquare(origin, target) {
    //
    //     let originLoc = this._getCleanPosition(origin);
    //     let targetLoc = this._getCleanPosition(target);
    //
    //     let originSizeWidth = (origin?.data?.width ?? 1) * canvas.grid.size;
    //     let originSizeHeight = (origin?.data?.height ?? 1) * canvas.grid.size;
    //     let originBottom = Math.max(originSizeWidth - canvas.grid.size, canvas.grid.size);
    //     let originRight = Math.max(originSizeHeight - canvas.grid.size, canvas.grid.size);
    //
    //     let targetSizeWidth = (target?.data?.width ?? 1) * canvas.grid.size;
    //     let targetSizeHeight = (target?.data?.height ?? 1) * canvas.grid.size;
    //
    //     let ray = new Ray(originLoc, targetLoc);
    //
    //     let dx = ray.dx;
    //     let dy = ray.dy;
    //
    //     if (dx > 0 && Math.abs(dx) > originRight) {
    //         dx -= originSizeWidth;
    //     } else if (dx < 0 && Math.abs(dx) > targetSizeWidth){
    //         dx += targetSizeHeight;
    //     }else{
    //         dx = 0;
    //     }
    //
    //     if (dy > 0 && Math.abs(dy) > originBottom) {
    //         dy -= originSizeHeight;
    //     } else if (dy < 0 && Math.abs(dy) > targetSizeHeight){
    //         dy += targetSizeHeight;
    //     }else{
    //         dy = 0;
    //     }
    //
    //     return {
    //         x: originLoc.x + dx,
    //         y: originLoc.y + dy
    //     };
    //
    // }

    _onHoverNote(note, hover) {
        // if (!hover || !this._getTeleportRegionsForMapNote(note.scene, note.data).length) {
        //   return;
        // }
        // if (!note.mouseInteractionManager.mltOverride) {
        //   note.mouseInteractionManager.mltOverride = true;
        //
        //   const oldPermission = note.mouseInteractionManager.permissions.clickLeft;
        //   const oldCallback = note.mouseInteractionManager.callbacks.clickLeft;
        //   note.mouseInteractionManager.permissions.clickLeft = () => true;
        //   note.mouseInteractionManager.callbacks.clickLeft = (event) => {
        //     if (this._isPrimaryGamemaster()) {
        //       this._doMapNoteTeleport(note.scene, note.data, game.user);
        //     } else {
        //       game.socket.emit(`module.${BIBLT.SCOPE}`, {
        //         operation: "clickMapNote",
        //         user: game.user.id,
        //         scene: note.scene.id,
        //         note: note.id,
        //       });
        //     }
        //     if (oldPermission.call(note, game.user)) {
        //       oldCallback.call(note, event);
        //     }
        //   };
        // }
    }

    refreshAll() {
      if (!this._isPrimaryGamemaster()) {
        return;
      }
      console.log(BIBLT.LOG_PREFIX, "Refreshing all");
      // this._queueAsync(requestBatch => {
      //   game.scenes.forEach(scene => {
      //     this._getInvalidReplicatedTokensForScene(scene)
      //         .forEach(token => requestBatch.deleteToken(scene, token._id));
      //
      //     scene.data.drawings
      //         .filter(r => this._hasRegionFlag(r.data, "source"))
      //         .forEach(r => this._updateAllReplicatedTokensForSourceRegion(requestBatch, scene, r.data));
      //   });
      // });
    }

    _onSocket(data) {
        if (!this._isPrimaryGamemaster()) {
            return;
        }
        if (data.operation === "myOperation") {
            const scene = game.scenes.get(data.scene);
            const user = game.users.get(data.user);
            if (!scene || !user) {
                return;
            }

            const note = scene.data.notes.find(note => note.id === data.note)?.data;
            if (note) {
                // this._doMapNoteTeleport(scene, note, user);
            }
        }
    }

}

console.log(BIBLT.LOG_PREFIX, "Loaded");
Hooks.on('init', () => game.bibelot = new Bibelot());
