const promptInput = document.getElementById("prompt");
const aspectInput = document.getElementById("aspect");

const generateButton = document.getElementById("generate");
const buttonText = document.getElementById("buttonText");

const statusBox = document.getElementById("statusBox");
const statusTitle = document.getElementById("statusTitle");
const statusText = document.getElementById("statusText");

const resultSection = document.getElementById("resultSection");
const video = document.getElementById("video");
const downloadButton = document.getElementById("downloadButton");

const characterCount = document.getElementById("characterCount");
const exampleButton = document.getElementById("exampleButton");


const examplePrompt =
    "A cinematic drone shot flying over a futuristic megacity at sunset, towering glass buildings, neon signs, flying cars, wet streets reflecting colorful lights, realistic film look, dramatic atmosphere";


/* CHARACTER COUNTER */

promptInput.addEventListener("input", () => {
    characterCount.textContent =
        `${promptInput.value.length} / 1200`;
});


/* EXAMPLE */

exampleButton.addEventListener("click", () => {

    promptInput.value = examplePrompt;

    characterCount.textContent =
        `${promptInput.value.length} / 1200`;

    promptInput.focus();
});


/* GENERATE */

generateButton.addEventListener("click", async () => {

    const prompt = promptInput.value.trim();
    const aspect = aspectInput.value;

    if (!prompt) {

        showError(
            "Please describe the video you want to create."
        );

        promptInput.focus();

        return;
    }

    if (prompt.length < 10) {

        showError(
            "Please provide a more detailed prompt."
        );

        promptInput.focus();

        return;
    }


    setGenerating(true);

    resultSection.hidden = true;

    statusBox.hidden = false;

    statusTitle.textContent =
        "Starting generation...";

    statusText.textContent =
        "Sending your prompt to the AI video model.";


    try {

        const response = await fetch(
            "/api/generate",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt,
                    aspect
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to start video generation."
            );
        }


        statusTitle.textContent =
            "Generating your video...";

        statusText.textContent =
            "The AI is rendering your scene. Please wait.";


        await pollPrediction(data.id);

    } catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Something went wrong."
        );

        setGenerating(false);
    }

});


/* POLL */

async function pollPrediction(id) {

    const maxAttempts = 120;

    for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
    ) {

        await sleep(4000);


        const response = await fetch(
            `/api/generate?id=${encodeURIComponent(id)}`
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to check generation status."
            );
        }


        const status =
            String(data.status || "").toLowerCase();


        if (status === "starting") {

            statusTitle.textContent =
                "Starting AI model...";

            statusText.textContent =
                "Preparing the video generation model.";

        } else if (status === "processing") {

            statusTitle.textContent =
                "Creating your video...";

            statusText.textContent =
                "Rendering frames and building your scene.";

        } else if (
            status === "succeeded" ||
            status === "completed"
        ) {

            const output =
                getVideoUrl(data.output);


            if (!output) {

                throw new Error(
                    "The AI finished, but no video URL was returned."
                );
            }


            showResult(output);

            setGenerating(false);

            return;

        } else if (
            status === "failed" ||
            status === "canceled" ||
            status === "cancelled"
        ) {

            throw new Error(
                data.error ||
                `Video generation ${status}.`
            );
        }


        const progress =
            Math.min(
                Math.round(
                    ((attempt + 1) / maxAttempts) * 100
                ),
                99
            );


        statusText.textContent =
            `Rendering your video... ${progress}%`;
    }


    throw new Error(
        "Generation took too long. Please try again."
    );
}


/* OUTPUT NORMALIZER */

function getVideoUrl(output) {

    if (!output) {
        return null;
    }

    if (typeof output === "string") {
        return output;
    }

    if (Array.isArray(output)) {

        return (
            output.find(
                item =>
                    typeof item === "string" &&
                    item.startsWith("http")
            ) || null
        );
    }

    return null;
}


/* SHOW RESULT */

function showResult(url) {

    statusBox.hidden = true;

    video.src = url;

    downloadButton.href = url;

    resultSection.hidden = false;

    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


/* ERROR */

function showError(message) {

    statusBox.hidden = false;

    statusTitle.textContent =
        "Generation failed";

    statusText.textContent =
        message;

    const loader =
        statusBox.querySelector(".loader");

    if (loader) {
        loader.style.display = "none";
    }
}


/* BUTTON STATE */

function setGenerating(isGenerating) {

    generateButton.disabled =
        isGenerating;

    if (isGenerating) {

        buttonText.textContent =
            "Generating...";

    } else {

        buttonText.textContent =
            "Generate Video";
    }
}


/* SLEEP */

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}
