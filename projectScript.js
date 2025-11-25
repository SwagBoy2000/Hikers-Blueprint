// Constructs map with options
const map = L.map('map', {
    //center: [36.55, 29.90],
    zoom: 9,
    maxBounds: [
        [36, 29],
        [37.1, 31]
    ],
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
const url = './lycianWayALL.gpx';
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
const elevation = function (n) { return gpx._info.elevation._points[n][1] }
const distanceFromStart = n => gpx._info.elevation._points[n][0]
let points
let segmData



//Creates gpx layer
const gpx = new L.GPX(url, options).on("addline", function (e) {
    console.log(e)

    const polyline = e.line;            // This is the track line
    points = polyline.getLatLngs(); // Array of LatLng points
    //addEndPoints()

    gpx.on("click", (e) => {            //onclick event on the polyline or gpx track
        getClosestPoint(e);
    })
}).on('loaded', function (e) {

    map.fitBounds(e.target.getBounds());
}).addTo(map);

/*  Implement After fixing structure
const endPointsBtn = document.getElementById("toggleEndPoints");
endPointsBtn.addEventListener("click", toggleEndPoints);
let endPointsIsActive = false
function toggleEndPoints() {
    if (endPointsIsActive === false) {
    activePoints.push({ lat: points[0].lat, lng: points[0].lng, distanceFromStart: distanceFromStart(0), elevation: elevation(0), index: 0 })
    activePoints.push({ lat: points[points.length - 1].lat, lng: points[points.length - 1].lng, distanceFromStart: distanceFromStart(points.length - 1), elevation: elevation(points.length - 1), index: points.length - 1 })
    const startMarker = L.marker(points[0])
    startMarker.index = 0
    const endMarker = L.marker(points[points.length - 1])
    endMarker.index = points.length - 1
    startMarker.addTo(map);
    endMarker.addTo(map);
    endPointsIsActive = true
    } else {

    }
calcSegmentData()
}
*/
function getClosestPoint(e) {
    let minDistance = map.distance(e.latlng, points[0]);
    let nearestPoint
    //loop checking distance of click and retrieving the nearest point on the line
    for (let i = 0; i < points.length; i++) {
        let clickDistance = map.distance(e.latlng, points[i]);
        if (clickDistance < minDistance) {
            minDistance = clickDistance
            nearestPoint = points[i]
            index = i                //assigning the gpx point index to find other info
        }
    }
    const aMarker = L.marker(nearestPoint)
    aMarker.index = index
    aMarker.addTo(map);
    //console.log(aMarker)


    aMarker.on("click", () => {       //trying to delete the point corresponding to the marker
        aMarker.remove()

        activePoints.splice(activePoints.findIndex(point => point.index === aMarker.index), 1)
        calcSegmentData()
    })

    activePoints.push({ lat: nearestPoint.lat, lng: nearestPoint.lng, distanceFromStart: distanceFromStart(index), elevation: elevation(index), index })
    // sorting it by index (distance from the east starting point)
    activePoints.sort((a, b) => a.index - b.index)

    calcSegmentData()
}

// is the repo working?

function calcSegmentData() {

    const segmDistances = []
    const segmElevation = []           // emptying the arrays
    const segmDuration = []

    for (let i = 0; i < activePoints.length - 1; i++) {     //cycle through the points and calculate distance between each point
        let current = activePoints[i]
        let next = activePoints[i + 1]
        let currentDistance = current.distanceFromStart
        let nextDistance = next.distanceFromStart
        let segmDistance = nextDistance - currentDistance
        segmDistances.push(segmDistance)

        let segmGain = 0
        let segmLoss = 0

        for (let x = current.index; x < next.index; x++) {      //cycle through every point in the segment to get exact elevation delta
            let elevationDelta = elevation(x + 1) - elevation(x)
            if (elevationDelta > 0) {
                segmGain += elevationDelta
            } else if (elevationDelta < 0) {
                segmLoss += Math.abs(elevationDelta)
            }
        }
        segmElevation.push({ segmGain, segmLoss })

        let flatSpeed = 4
        let elevationSpeed = 0.5

        let segmTime = ((segmDistance / 1000) / flatSpeed) + ((segmGain / 1000) / elevationSpeed)

        segmDuration.push(segmTime)
    }



    segmData = segmDistances.map((distance, index, arr) => { //copying the segment data in a new array
        const elevationGain = segmElevation[index].segmGain;
        const elevationLoss = segmElevation[index].segmLoss;
        const duration = segmDuration[index];
        return { distance, elevationGain, elevationLoss, duration }
    })
    console.log({ activePoints })
    //console.log({ segmData })

    renderData()
}



const segmentTemplate = document.getElementById("segmentTemplate")
const dataContainer = document.getElementById("data")

function renderData() {
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
















