(function () {


    Sudoku.GameBoard3D = function (gameBoard) {

        var n, nSqrd, cSpace, sgSpace, cSize, gSGB;
        n = gameBoard.getGameSize();
        nSqrd = n * n;
        cSpace = Sudoku.GameBoard3D.cellSpacing;
        sgSpace = Sudoku.GameBoard3D.subGridSpacing;
        cSize = Sudoku.GameBoard3D.cellSize;
        gSGB = gameBoard.getSubGridBoundsContainingCell.bind(gameBoard);

        THREE.Object3D.call(this);

        this._gameBoard = gameBoard;

        this._cells = new Utils.MultiArray(nSqrd, nSqrd);

        this._selectedCell = null;

        for (var i = 0; i < nSqrd; i++) {
            for (var j = 0; j < nSqrd; j++) {

                this._cells[i][j] = new Sudoku.GameBoardCell3D(i, j, this._gameBoard.getValue(i, j));
                this.add(this._cells[i][j]);

                this._cells[i][j].position.x = (j * (cSize + cSpace) + gSGB(i, j).jSubGrid * sgSpace) - 0.5 * ((nSqrd - 1) * (cSize + cSpace) + (n - 1) * sgSpace);
                this._cells[i][j].position.y = -(i * (cSize + cSpace) + gSGB(i, j).iSubGrid * sgSpace) + 0.5 * ((nSqrd - 1) * (cSize + cSpace) + (n - 1) * sgSpace);
                this._cells[i][j].position.z = 0;

                this._cells[i][j].addEventListener("selected", cellSelected.bind(this));
                this._cells[i][j].addEventListener("deselected", cellDeselected.bind(this));
            }
        }

        this._cells[0][0].select();

        this._gameBoard.addEventListener('valueEntered', valueEntered.bind(this));

        this._gameBoard.addEventListener('valueCleared', valueCleared.bind(this));

        this._gameBoard.addEventListener('startingConfigurationSaved', startingConfigurationSaved.bind(this));

        this._gameBoard.addEventListener('startingConfigurationDiscarded', startingConfigurationDiscarded.bind(this));

        this._gameBoard.addEventListener("clash", clashRouter.bind(this));

        this._gameBoard.addEventListener("gameComplete", gameComplete.bind(this));

        this._keyPressRouter = keyPressRouter.bind(this);

        window.addEventListener("keydown", this._keyPressRouter, false);

    };


    Sudoku.GameBoard3D.cellSize = 300;


    Sudoku.GameBoard3D.cellSpacing = 20;


    Sudoku.GameBoard3D.subGridSpacing = 40;


    Sudoku.GameBoard3D.prototype = Object.create(THREE.Object3D.prototype);


    function valueEntered(event){

        this._cells[event.i][event.j].valueEntered(event.value);

        return this;

    }


    function valueCleared(event){

        this._cells[event.i][event.j].valueCleared();

        return this;

    }


    function startingConfigurationSaved(event){

        var startConf = event.startingConfiguration;

        for(var i = 0, l = startConf.length; i < l; i++){
            this._cells[startConf[i].i][startConf[i].j].setAsStartingCell();
        }

        return this;

    }


    function startingConfigurationDiscarded(event){

        var startConf = event.startingConfiguration;

        for(var k = 0, l = startConf.length; k < l; k++){
            this._cells[startConf[k].i][startConf[k].j].unsetAsStartingCell();
        }

        return this;

    }


    function cellSelected(event) {

        if (this._selectedCell !== null) {

            this._selectedCell.deselect();

        }

        this._selectedCell = event.cell;

    }


    function cellDeselected(event) {

        this._selectedCell = null;

    }


    function clashRouter(event) {

        var k
            , l
            , kUpper
            , lUpper
            , n = this._gameBoard.getGameSize()
            , nSqrd = n * n
            , sgb = this._gameBoard.getSubGridBoundsContainingCell(event.i, event.j)
            ;

        if (event.subType === "row") {

            k = event.i;
            l = 0;
            kUpper = k + 1;
            lUpper = nSqrd;

        } else if (event.subType === "column") {

            k = 0;
            l = event.j;
            kUpper = nSqrd;
            lUpper = l + 1;

        } else if (event.subType === "subGrid") {

            k = sgb.iLower;
            l = sgb.jLower;
            kUpper = sgb.iUpper + 1;
            lUpper = sgb.jUpper + 1;

        }

        for (; k < kUpper; k++) {
            for (var tempL = l; tempL < lUpper; tempL++) {
                if (k === event.i && tempL === event.j) {
                    this._cells[k][tempL].clash("Primary");
                } else {
                    this._cells[k][tempL].clash("Secondary");
                }
            }
        }

    }


    function keyPressRouter(event) {

        var n = this._gameBoard.getGameSize()
            , nSqrd = n * n
            , val
            , i
            , j
            ;

        if (this._selectedCell === null) {
            return;
        }

        /*left arrow*/
        if (event.keyCode === 37) {
            selectNextAvailableCellInDirection.call(this, 'left');
            return;
        }

        /*up arrow*/
        if (event.keyCode === 38) {
            selectNextAvailableCellInDirection.call(this, 'up');
            return;
        }

        /*right arrow*/
        if (event.keyCode === 39) {
            selectNextAvailableCellInDirection.call(this, 'right');
            return;
        }

        /*down arrow*/
        if (event.keyCode === 40) {
            selectNextAvailableCellInDirection.call(this, 'down');
            return;
        }

        val = Sudoku.getTextureIndexFromKeyCode(event.keyCode);
        if (val > 0) {
            this._gameBoard.enterValue(this._selectedCell.i, this._selectedCell.j, val);
        } else if (val === 0) {
            this._gameBoard.clearValue(this._selectedCell.i, this._selectedCell.j);
        }
    }


    function selectNextAvailableCellInDirection(dir){

        var n = this._gameBoard.getGameSize()
            , nSqrd = n * n
            , i = this._selectedCell.i
            , j = this._selectedCell.j
            , iterIdx
            ;

        if(dir === "left" || dir === "up"){
            iterIdx = function(idx){return (idx - 1 < 0) ? nSqrd - 1 : idx - 1;};
        } else {
            iterIdx = function(idx){return (idx + 1 >= nSqrd) ? 0 : idx + 1;};
        }

        do {
            if(dir === "left" || dir === "right"){
                j = iterIdx(j);
            } else {
                i = iterIdx(i);
            }
        } while(!this._cells[i][j].select().isSelected())

    }


    function gameComplete() {

        var n = this._gameBoard.getGameSize()
            , nSqrd = n * n
            ;

        for (var i = 0; i < nSqrd; i++) {
            for (var j = 0; j < nSqrd; j++) {
                this._cells[i][j].gameComplete();
            }
        }

    }

})();