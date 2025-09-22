# EcoMove

EcoMove is a mobile app that makes recycling simple and social. It combines a **Scanner** powered by YoloV8s, a **Local Guide** with city/state‑specific recycling rules and drop‑off locations, and **Community Posts** for swapping, donating, and sharing leftover items.

## Features

### Scanner

* Live camera scanner to identify common recyclable materials (e.g., cans, bottles, cardboard) using a YoloV8s model.
* Draws bounding boxes, labels, and confidence scores.
* One‑tap logging to your **Impact Profile**.

### Local Guide

* State/city rules for recyclable, compost, trash, or special handling items.
* Nearby drop‑off locations (e.g., e‑waste, hazardous materials).

### Community Posts

* Create posts with **photo, title, description, location, and phone** to swap/donate items.
* Simple JSON‑backed API for quick prototyping.


## Architecture

```
+-------------------------+        HTTP/JSON        +------------------------+
|  React Native (Expo)    |  <------------------>   |   Flask API (Python)   |
|  - Scanner (Camera)     |                         | - /posts CRUD (JSON)   |
|  - Guide (rules)        |                         | - /detect              |
|  - Community (feed)     |                         | - CORS & static files  |
+-------------------------+                         +------------------------+
```

* **Frontend** calls the Flask API for posts (`/posts`) and remote detection (`/detect`).
* **Backend** stores posts in a local JSON file for simplicity and exposes REST endpoints.

## Tech Stack

**Frontend**
* Node
* React Native (Expo)

**Backend**

* Python 3.10+

## Prerequisites

* **Node.js** 18+
* **Yarn** or **npm**
* **Python** 3.10+
* **Git**
* **Expo Go** app on a mobile phone
* The computer and phone must be on the same network


## Quick Start
Download the Repo: 
```bash
git clone ""
cd 
```
### 1) Backend — Python Flask API

```bash
# From project root
cd EcoMoveBackend
# Download the model file from here and place it in the folder: https://github.com/jeremy-rico/litter-detection/blob/master/runs/detect/train/yolov8s_100epochs/weights/best.pt 

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install torch torchvision ultralytics pillow Werkzeug flask flask_cors

python api.py

```

### 2) Frontend — React Native (Expo)
---

```bash
# From Project root
cd EcoMoveUI

npm i    

# this line in constants/server.ts so that it have the url of your api from above

# export const BASE_URL = "http://192.168.0.137:8000";

npm start
```
You can the scan the QR code in the termal on your phone and expo will connect and start the app


Sources:

Database for Local Dropoffs:
https://experience.arcgis.com/experience/6aaa6b2293eb41c4a77845e6304f176a/page/Recycling-Map (downloaded all major facilities dropoffs)

Fun Facts Sources:
https://www.paperandpackaging.org/sites/default/files/2021-09/New%20Survey%20Reveals%20Gaps%20in%20Consumer%20Recycling%20Behavior%20and%20Knowledge%20-%20For%20Immediate%20Release_0.pdf?
vhttps://www.movebuddha.com/blog/moving-waste/
https://www.epa.gov/facts-and-figures-about-materials-waste-and-recycling/national-overview-facts-and-figures-materials
U.S. Environmental Protection Agency (EPA) – https://www.epa.gov/recycle
National Geographic – Plastic Pollution coverage
Ocean Conservancy – International Coastal Cleanup Reports
World Health Organization (WHO) – Cigarette & Tobacco Facts
The Recycling Partnership – https://recyclingpartnership.org/
ReFED Policy Finder – https://policyfinder.refed.org/
Carton Council – https://www.cartonopportunities.org/
Aluminium Association – https://www.aluminum.org/
FAO – Food Waste Statistics

Trash Dataset Source: 
http://tacodataset.org/



