var viewModel;

// TWO stuff
var two;
var canvasWidth;
var canvasHeight;

async function PackContainers(request) {
    return $.ajax({
        url: '/api/containerpacking',
        type: 'POST',
        data: request,
        contentType: 'application/json; charset=utf-8'
    });
};

var ViewModel = function () {
    var self = this;

    self.ItemCounter = 0;
    self.ContainerCounter = 0;

    self.ItemsToRender = ko.observableArray([]);
    self.LastItemRenderedIndex = ko.observable(-1);

    self.CurrentContainer = ko.observable();
    self.ItemsInLayers = ko.observableArray([]);
    self.ItemsSummary = ko.observableArray([]);
    self.LastLayerRenderedIndex = ko.observable(-1);

    self.ItemsCountInCurrentContainer = function () {
        if (self.CurrentContainer() == undefined) return 0;
        else {
            var results = self.CurrentContainer().AlgorithmPackingResults();
            if (results.length > 0) return results[0].PackedItems.length;
            else return 0;
        }
    };

    self.ItemsCountInLayer = function (layer) {
        if (layer == undefined) return 0;
        else return layer.length;
    };

    self.CurrentLayer = function () {
        return self.ItemsInLayers()[self.LastLayerRenderedIndex()];
    };

    self.LayerDescription = function () {
        return "Layer " + (self.LastLayerRenderedIndex() + 1) +
            " of " + self.ItemsInLayers().length +
            ", " + self.ItemsCountInLayer(self.CurrentLayer()) +
            " items of " + self.ItemsCountInCurrentContainer() + " in total";
    };

    self.ContainerOriginOffset = {
        x: 0,
        y: 0,
        z: 0
    };

    self.AlgorithmsToUse = ko.observableArray([{ AlgorithmID: 1, AlgorithmName: "EB-AFIT" }]);
    self.ItemsToPack = ko.observableArray([]);
    self.Containers = ko.observableArray([]);

    self.NewItemToPack = ko.mapping.fromJS(new ItemToPack());
    self.NewContainer = ko.mapping.fromJS(new Container());

    self.GenerateItemsToPack = function () {
        self.ItemsToPack([]);
        self.ItemsToPack.push(ko.mapping.fromJS({ ID: 1000, Name: '工件A', Length: 1460, Width: 450, Height: 780, Quantity: 10 }));
        self.ItemsToPack.push(ko.mapping.fromJS({ ID: 1001, Name: '工件B', Length: 1660, Width: 340, Height: 260, Quantity: 20 }));
        self.ItemsToPack.push(ko.mapping.fromJS({ ID: 1002, Name: '工件C', Length: 1520, Width: 640, Height: 390, Quantity: 30 }));
    };

    self.GenerateContainers = function () {
        self.Containers([]);
        self.Containers.push(ko.mapping.fromJS({ ID: 1000, Name: '小柜', Length: 5800, Width: 2340, Height: 2380, AlgorithmPackingResults: [] }));
        self.Containers.push(ko.mapping.fromJS({ ID: 1001, Name: '平柜', Length: 12000, Width: 2340, Height: 2380, AlgorithmPackingResults: [] }));
        self.Containers.push(ko.mapping.fromJS({ ID: 1002, Name: '高柜', Length: 12000, Width: 2340, Height: 2680, AlgorithmPackingResults: [] }));
    };

    self.AddNewItemToPack = function () {
        self.NewItemToPack.ID(self.ItemCounter++);
        self.ItemsToPack.push(ko.mapping.fromJS(ko.mapping.toJS(self.NewItemToPack)));
        self.NewItemToPack.Name('');
        self.NewItemToPack.Length('');
        self.NewItemToPack.Width('');
        self.NewItemToPack.Height('');
        self.NewItemToPack.Quantity('');
    };

    self.RemoveItemToPack = function (item) {
        self.ItemsToPack.remove(item);
    };

    self.AddNewContainer = function () {
        self.NewContainer.ID(self.ContainerCounter++);
        self.Containers.push(ko.mapping.fromJS(ko.mapping.toJS(self.NewContainer)));
        self.NewContainer.Name('');
        self.NewContainer.Length('');
        self.NewContainer.Width('');
        self.NewContainer.Height('');
    };

    self.RemoveContainer = function (item) {
        self.Containers.remove(item);
    };

    self.PackContainers = function () {
        var algorithmsToUse = [];

        self.AlgorithmsToUse().forEach(algorithm => {
            algorithmsToUse.push(algorithm.AlgorithmID);
        });

        var itemsToPack = [];

        self.ItemsToPack().forEach(item => {
            var itemToPack = {
                ID: item.ID(),
                Name: item.Name(),
                Dim1: item.Length(),
                Dim2: item.Width(),
                Dim3: item.Height(),
                Quantity: item.Quantity()
            };

            itemsToPack.push(itemToPack);
        });

        var containers = [];

        // Send a packing request for each container in the list.
        self.Containers().forEach(container => {
            var containerToUse = {
                ID: container.ID(),
                Length: container.Length(),
                Width: container.Width(),
                Height: container.Height()
            };

            containers.push(containerToUse);
        });

        // Build container packing request.
        var request = {
            Containers: containers,
            ItemsToPack: itemsToPack,
            AlgorithmTypeIDs: algorithmsToUse
        };

        PackContainers(JSON.stringify(request))
            .then(response => {
                // Tie this response back to the correct containers.
                response.forEach(containerPackingResult => {
                    self.Containers().forEach(container => {
                        if (container.ID() == containerPackingResult.ContainerID) {
                            container.AlgorithmPackingResults(containerPackingResult.AlgorithmPackingResults);
                        }
                    });
                });
            });
    };

    self.ShowPackingView2D = function (algorithmPackingResult) {
        var container = this;

        var layers = algorithmPackingResult.PackedItemsInLayers;
        var layeredItemsCount = 0;
        layers.forEach(layer => {
            layeredItemsCount += layer.length;
        });
        if (layeredItemsCount != algorithmPackingResult.PackedItems.length) {
            window.alert("请注意！分层件数总和与装箱件数不符，结果可能不可靠！！！");
        }
        self.ItemsInLayers(layers);
        self.CurrentContainer(container);

        // Show first layer if there are layers
        if (self.ItemsInLayers().length > 0) {
            self.LastLayerRenderedIndex(0);
            self.ShowPackingView2DOfLayer(self.CurrentContainer(), self.ItemsInLayers()[self.LastLayerRenderedIndex()]);
        }

    };

    self.CalculateContainerDimension = function (canvasWidth, canvasHeight, containerWidth, containerHeight) {
        var containerRatio = containerWidth / containerHeight;
        if (canvasWidth / containerRatio <= canvasHeight) {
            return [canvasWidth, canvasWidth / containerRatio];
        } else {
            return [(canvasHeight) * containerRatio, canvasHeight];
        }
    };

    self.SummaryOfLayer = function (layer) {
        var itemsMap = new Map();
        if (layer != undefined) {
            layer.forEach(item => {
                if (itemsMap.has(item.Name)) itemsMap.set(item.Name, itemsMap.get(item.Name) + 1);
                else itemsMap.set(item.Name, 1);
            });
        }

        var itemsSummary = [];
        for (var [key, val] of itemsMap) {
            itemsSummary.push({k: key, v: val});
        }

        self.ItemsSummary(itemsSummary);
    };

    self.ShowPackingView2DOfLayer = function (container, layer) {
        self.SummaryOfLayer(layer);

        console.log("Current Layer:");
        self.ItemsSummary().forEach(e => {
            console.log(e.k, e.v);
        });

        // Draw container
        two.clear();

        var containerDimension = self.CalculateContainerDimension(canvasWidth, canvasHeight, container.Length(), container.Width());
        containerRect = two.makeRectangle(canvasWidth / 2, containerDimension[1] / 2, containerDimension[0], containerDimension[1]);

        var displayRatio = containerDimension[0] / container.Length();

        containerRect.stroke = 'black';
        containerRect.linewidth = 1;

        var widthOffset = (canvasWidth - containerDimension[0]) / 2;
        // var heightOffset = (canvasHeight - containerDimension[1]) / 2;
        var heightOffset = 0;
        console.log("width = " + containerDimension[0] + ", height = " + containerDimension[1] + ", widthOffset = " + widthOffset + ", heightOffset = " + heightOffset);

        if (layer != undefined) {
            layer.forEach(box => {
                var boxRect_Center_X = displayRatio * (box.CoordX + box.PackDimX / 2) + widthOffset;
                var boxRect_Center_Y = displayRatio * (box.CoordZ + box.PackDimZ / 2) + heightOffset;
                var boxRect_Width = displayRatio * (box.PackDimX);
                var boxRect_Height = displayRatio * (box.PackDimZ);
                var boxRect = two.makeRectangle(
                    boxRect_Center_X,
                    boxRect_Center_Y,
                    boxRect_Width,
                    boxRect_Height
                );

                boxRect.stroke = 'orangered';
                boxRect.linewidth = 1;
                two.makeLine(
                    box.CoordX * displayRatio + widthOffset,
                    box.CoordZ * displayRatio + heightOffset,
                    displayRatio * (box.CoordX + box.PackDimX) + widthOffset,
                    displayRatio * (box.CoordZ + box.PackDimZ) + heightOffset);
                two.makeLine(
                    displayRatio * (box.CoordX + box.PackDimX) + widthOffset,
                    displayRatio * box.CoordZ + heightOffset,
                    displayRatio * box.CoordX + widthOffset,
                    displayRatio * (box.CoordZ + box.PackDimZ) + heightOffset
                );

                var name = new Two.Text(box.Name, boxRect_Center_X, boxRect_Center_Y + boxRect_Height / 2 - 2);
                name.baseline = 'baseline';
                two.add(name);
            });
        }

        two.update();
    };

    self.AreItemsPacked = function () {
        if (self.LastItemRenderedIndex() > -1) {
            return true;
        }

        return false;
    };

    self.AreAllItemsPacked = function () {
        if (self.ItemsToRender().length === self.LastItemRenderedIndex() + 1) {
            return true;
        }

        return false;
    };

    self.AreFirstLayer = function () {
        if (self.LastLayerRenderedIndex() === 0) return true;
        else return false;
    };

    self.AreLastLayer = function () {
        if (self.ItemsInLayers().length > 0 && self.LastLayerRenderedIndex() === self.ItemsInLayers().length - 1) return true;
        else return false;
    };

    self.DisplayPreviousLayer = function () {
        var layerIndex = self.LastLayerRenderedIndex() - 1;
        self.ShowPackingView2DOfLayer(self.CurrentContainer(), self.ItemsInLayers()[layerIndex]);
        self.LastLayerRenderedIndex(layerIndex);
    };

    self.DisplayNextLayer = function () {
        var layerIndex = self.LastLayerRenderedIndex() + 1;
        self.ShowPackingView2DOfLayer(self.CurrentContainer(), self.ItemsInLayers()[layerIndex]);
        self.LastLayerRenderedIndex(layerIndex);
    };

    self.OpenPrintWindow = function () {
        var printWindow = window.open("print.html");
        var toPrint = document.getElementById("layer").innerHTML
        printWindow.addEventListener("DOMContentLoaded", function () {
            printWindow.document.getElementById("layer").innerHTML = toPrint;
        });
    };
}

var ItemToPack = function () {
    this.ID = '';
    this.Name = '';
    this.Length = '';
    this.Width = '';
    this.Height = '',
        this.Quantity = '';
}

var Container = function () {
    this.ID = '';
    this.Name = '';
    this.Length = '';
    this.Width = '';
    this.Height = '';
    this.AlgorithmPackingResults = [];
}

function Initialize2DDrawing(kanvasWidth) {
    canvasWidth = kanvasWidth * 0.95;
    canvasHeight = kanvasWidth / 3;
    console.log("canvas: " + canvasWidth + " x " + canvasHeight);

    var elem = document.getElementById("drawing-container");
    while (elem.firstChild) {
        elem.removeChild(elem.lastChild);
    }
    var params = { width: canvasWidth, height: canvasHeight };
    two = new Two(params).appendTo(elem);
}

$(document).ready(() => {
    $('[data-toggle="tooltip"]').tooltip();
    checkLayerWidth();

    viewModel = new ViewModel();
    ko.applyBindings(viewModel);
});

var checkLayerWidth = function () {
    var kanvas = document.getElementById("kanvas");
    console.log("kanvas: ", kanvas.clientWidth, kanvas.clientHeight);
    Initialize2DDrawing(kanvas.clientWidth);
}

window.addEventListener('resize', checkLayerWidth);