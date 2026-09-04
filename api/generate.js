const REPLICATE_API =
    "https://api.replicate.com/v1";

const MODEL =
    "wan-video/wan-2.1-1.3b";


function sendJson(res, status, data) {
    res.status(status).json(data);
}


function validPredictionId(id) {
    return (
        typeof id === "string" &&
        /^[a-zA-Z0-9_-]{1,200}$/.test(id)
    );
}


function validAspect(aspect) {
    const allowed = [
        "16:9",
        "9:16",
        "1:1"
    ];

    return allowed.includes(aspect)
        ? aspect
        : "16:9";
}


async function replicateRequest(url, options = {}) {

    const token =
        process.env.REPLICATE_API_TOKEN;

    if (!token) {
        throw new Error(
            "REPLICATE_API_TOKEN is not configured."
        );
    }

    const response = await fetch(url, {
        ...options,

        headers: {
            "Authorization":
                `Bearer ${token}`,

            "Content-Type":
                "application/json",

            ...(options.headers || {})
        }
    });


    const text =
        await response.text();


    let data;

    try {
        data = JSON.parse(text);
    } catch {
        data = {
            error: text
        };
    }


    if (!response.ok) {

        const message =
            data?.detail ||
            data?.error ||
            `Replicate returned HTTP ${response.status}`;

        throw new Error(message);
    }


    return data;
}


export default async function handler(req, res) {

    try {

        /*
         * CREATE VIDEO
         */

        if (req.method === "POST") {

            const {
                prompt,
                aspect
            } = req.body || {};


            if (
                typeof prompt !== "string" ||
                prompt.trim().length < 10
            ) {

                return sendJson(
                    res,
                    400,
                    {
                        error:
                            "Please provide a detailed prompt."
                    }
                );
            }


            if (prompt.length > 1200) {

                return sendJson(
                    res,
                    400,
                    {
                        error:
                            "Prompt is too long."
                    }
                );
            }


            const selectedAspect =
                validAspect(aspect);


            const prediction =
                await replicateRequest(
                    `${REPLICATE_API}/models/${MODEL}/predictions`,
                    {
                        method: "POST",

                        body: JSON.stringify({
                            input: {

                                prompt:
                                    prompt.trim(),

                                resolution:
                                    "480p",

                                aspect_ratio:
                                    selectedAspect,

                                frame_num:
                                    81,

                                sample_steps:
                                    30,

                                sample_shift:
                                    8,

                                sample_guide_scale:
                                    6
                            }
                        })
                    }
                );


            return sendJson(
                res,
                200,
                {
                    id:
                        prediction.id,

                    status:
                        prediction.status
                }
            );
        }


        /*
         * CHECK VIDEO STATUS
         */

        if (req.method === "GET") {

            const id =
                req.query?.id;


            if (!validPredictionId(id)) {

                return sendJson(
                    res,
                    400,
                    {
                        error:
                            "Invalid prediction ID."
                    }
                );
            }


            const prediction =
                await replicateRequest(
                    `${REPLICATE_API}/predictions/${id}`
                );


            return sendJson(
                res,
                200,
                {
                    id:
                        prediction.id,

                    status:
                        prediction.status,

                    output:
                        prediction.output || null,

                    error:
                        prediction.error || null
                }
            );
        }


        res.setHeader(
            "Allow",
            "GET, POST"
        );


        return sendJson(
            res,
            405,
            {
                error:
                    "Method not allowed."
            }
        );


    } catch (error) {

        console.error(error);


        return sendJson(
            res,
            500,
            {
                error:
                    error.message ||
                    "Server error."
            }
        );
    }
}
