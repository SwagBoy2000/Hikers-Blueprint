// Constructs map with options
const map = L.map('map', {
    //center: [36.55, 29.90],
    zoom: 9,

    minZoom: 7,
});

//https://leaflet-extras.github.io/leaflet-providers/preview
//Other Maps database

// Adds visual map layer from openStreetMap
//L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
//    { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);

thunderForestOutdoors = L.tileLayer('https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=2e45d77da76c42a88e9c3358426bfb46', {
    maxZoom: 20,
}).addTo(map);


// finds gpx file and sets gpx options
const url = './caminoRoute.gpx';
const options = {
    async: true,
    polyline_options: { color: 'red' },
    markers: {
        startIcon: null,
        endIcon: null,
    }
};

//GLOBAL VARIBLES DECLARATION
const activePoints = []
let pointsArray = []
let isTrackReversed = false
let isEndPointActive = false



//Creates gpx layer
const gpx = new L.GPX(url, options).on("addline", function (e) {

    const polyline = e.line;            // This is the track line
    let points = polyline.getLatLngs(); // Array of LatLng points
    const gpxData = gpx._info.elevation._points
    //addEndPoints()

//this gather the data in a single array
    pointsArray = gpxData.map((pt, index) => ({ //parenthesis around the object makes it return the object
        lat: points[index].lat,
        lng: points[index].lng,
        elevation: pt[1],
        distanceFromStart: pt[0],
        index
    }))
    
    polyline.on("click", (e) => {        //onclick event on the polyline or gpx track
        getClosestPoint(e);
    })

}).on('loaded', function (e) {

    map.fitBounds(e.target.getBounds());
}).addTo(map);




  //Implement After fixing structure
const endPointsBtn = document.getElementById("toggleEndPoints");
endPointsBtn.addEventListener("click", toggleEndPoints);
function toggleEndPoints() {
    isEndPointActive = !isEndPointActive
    const startPoint = pointsArray[0]
    const endPoint = pointsArray[pointsArray.length -1];
    console.log(endPoint)

    if (isEndPointActive) { //fix when user clicks on end markers
        addActivePoints(startPoint)
        addActivePoints(endPoint)
        addMarker(startPoint)
        addMarker(endPoint)
    } else {
        activePoints.splice(0, 1)
        activePoints.splice(activePoints.length - 1 , 1)
        //removeMarker() Come Fare? Forse creare una classe marker con metodo remove?
    }
calcSegmentData()
}

function getClosestPoint(e) {
    let minDistance = 1000000000000;
    let nearestPoint

    //loop checking distance of click and retrieving the nearest point on the line
    pointsArray.forEach((pt) => {
        let clickDistance = map.distance(e.latlng, pt);
        if (clickDistance < minDistance) {
            minDistance = clickDistance
            nearestPoint = pt
        }
    })
    
    addMarker(nearestPoint)
    addActivePoints(nearestPoint)
    calcSegmentData()
}

function addActivePoints(pt) {
    activePoints.push(pt)
    // sorting it by index (distance from the east starting point)
    activePoints.sort((a, b) => a.index - b.index)
}

function addMarker(pt) {
    const aMarker = L.marker(pt)
    aMarker.index = pt.index
    aMarker.addTo(map);
    
    aMarker.on("click", () => {       //trying to delete the point corresponding to the marker
        aMarker.remove()
        activePoints.splice(activePoints.findIndex((pt) => pt.index === aMarker.index), 1)
        calcSegmentData()        
    })
}

function calcSegmentData() {
    
    const segmDistances = []
    const segmElevation = []           // emptying the arrays
    const segmDuration = []
    
    for (let i = 0; i < activePoints.length - 1; i++) {     //cycle through the points and calculate distance between each point
        let current = activePoints[i]
        let next = activePoints[i + 1]
        let segmDistance = Math.abs(next.distanceFromStart - current.distanceFromStart)
        segmDistances.push(segmDistance)
        
        let segmGain = 0
        let segmLoss = 0
        
        for (let x = current.index; x < next.index; x++) {      //cycle through every point in the segment to get exact elevation delta
            let elevationDelta = pointsArray[x + 1].elevation - pointsArray[x].elevation
            if (elevationDelta > 0) {
                segmGain += elevationDelta
            } else if (elevationDelta < 0) {
                segmLoss += Math.abs(elevationDelta)
            }
        }
        segmElevation.push({ segmGain, segmLoss })
        
        let flatSpeed = 4
        let elevationSpeed = 0.5
        let segmTime
        
        if (!isTrackReversed) {
            segmTime = ((segmDistance / 1000) / flatSpeed) + ((segmGain / 1000) / elevationSpeed)
        }
        if (isTrackReversed) {
            segmTime = ((segmDistance / 1000) / flatSpeed) + ((segmLoss / 1000) / elevationSpeed)
        }
        
        segmDuration.push(segmTime)
    }

        let segmData = segmDistances.map((distance, index, arr) => { //copying the segment data in a new array
            const elevationGain = segmElevation[index].segmGain;
            const elevationLoss = segmElevation[index].segmLoss;
            const duration = segmDuration[index];
            return { distance, elevationGain, elevationLoss, duration }
        })

        if (isTrackReversed) {
            segmData = segmData.reverse().map((segm) => ({...segm, elevationGain: segm.elevationLoss, elevationLoss: segm.elevationGain }))
        }

    console.log({ activePoints })
    console.log({ segmData })
    
    renderData(segmData)
}

function reverseStartFinish() {
    isTrackReversed = !isTrackReversed
    calcSegmentData()
}

const segmentTemplate = document.getElementById("segmentTemplate")
const dataContainer = document.getElementById("data")

function renderData(segmData) {
    dataContainer.replaceChildren()
    segmData.map((segm, index) => {
        const card = segmentTemplate.content.cloneNode(true).children[0]

        const title = card.querySelector(".title")
        const distance = card.querySelector(".distance")
        const elevationGain = card.querySelector(".elevationGain")
        const elevationLoss = card.querySelector(".elevationLoss")
        const duration = card.querySelector(".duration")

        title.textContent = "Segment " + (1 + +index)
        distance.textContent = "Distance: " + Math.round(segm.distance / 10) / 100 + " km"
        elevationGain.textContent = "Elevation gain: " + Math.round(segm.elevationGain) + " m"
        elevationLoss.textContent = "Elevation loss: " + Math.round(segm.elevationLoss) + " m"
        const hours = Math.floor(segm.duration);
        const minutes = Math.round((segm.duration - hours) * 60);
        duration.textContent = `Estimated duration: ${hours}h ${minutes}m`

        dataContainer.append(card)
    })
}
















