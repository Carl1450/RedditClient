const BASE_URL = "https://corsproxy.io/?https://www.reddit.com/r";

document.getElementById("add-lane-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const subredditInput = document.getElementById("subreddit-input");
    const raw = subredditInput.value.trim();

    if (!raw) {
        alert("Please enter a subreddit name.");
        return;
    }

    const subreddit = raw.replace(/^r\//i, "").trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(subreddit)) {
        alert("Invalid subreddit name. Please use only letters, number underscores, or dashes.");
        return;
    }

    const laneElement = createLaneElement(subreddit);
    document.getElementById("lanes-container").appendChild(laneElement);
    subredditInput.value = "";

    loadLane(laneElement, subreddit);
});

function createLaneElement(subreddit) {
    const laneEl = document.createElement("section");
    laneEl.className =
    "min-w-[260px] max-w-xs flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-3 shadow-md";

    laneEl.innerHTML = `
    <header class="flex items-center justify-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            <span class="lane-title text-sm font-semibold text-slate-100">
                r/${subreddit}
            </span>
        </div>
        <div class="flex items-center gap-2">
            <select class="sort-dropdown text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300">
                <option value="hot">Hot</option>
                <option value="new">New</option>
                <option value="top">Top</option>
                <option value="best">Best</option>
            </select>
            <select class="time-dropdown text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300" disabled>
                <option value="hour">Now</option>
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
            </select>
            <button
                class="remove-lane-btn text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
            X
            </button>
        </div>
    </header>
    <div class="lane-status text-xs text-slate-400 mb-2"></div>
    <div class="lane-posts flex flex-col gap-2 text-sm"></div>
    `;

    laneEl.querySelector(".remove-lane-btn").addEventListener("click", () => {
        laneEl.remove();
    });

    const sortDropdown = laneEl.querySelector(".sort-dropdown");
    const timeDropdown = laneEl.querySelector(".time-dropdown");

    sortDropdown.addEventListener("change", (event) => {
        const sort = event.target.value;
        if (sort === "top" || sort === "controversial") {
            timeDropdown.disabled = false;
        } else {
            timeDropdown.disabled = true;
        }
        const time = timeDropdown.value;
        loadLane(laneEl, subreddit, sort, time);
    });

    timeDropdown.addEventListener("change", (event) => {
        const sort = sortDropdown.value;
        const time = event.target.value;
        loadLane(laneEl, subreddit, sort, time);
    });

    return laneEl;
}

function renderLanePosts(laneElement, posts) {
    const postsContainer = laneElement.querySelector(".lane-posts");
    postsContainer.innerHTML = "";

    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="text-sm text-slate-400">
                No posts available.
            </div>
        `;
        return;
    }

    posts.slice(0, 15).forEach((post) => {
        const postEl = document.createElement("article");
        postEl.className = 
        "post rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 hover:border-indigo-500/70 transition";

        const title = post.title;
        const author = post.author;
        const ups = post.ups;
        const permalink = post.permalink;

        postEl.innerHTML= `
            <div class="post-title mb-1">
                <a
                    href="https://www.reddit.com${permalink}"
                    target="_blank"
                    rel="noreferrer"
                    class="text-sm font-medium text-slate-100 hover:text-indigo-400"
                >
                    ${title}
                </a>
            </div>
            <div class="post-meta text-[11px] text-slate-400">
                ▲ ${ups} • u/${author}
            </div>
        `;

        postsContainer.appendChild(postEl);
    });
}

function setLaneStatus(laneElement, message, isError = false) {
    const statusEl = laneElement.querySelector(".lane-status");
    statusEl.textContent = message;

    statusEl.className =
        "lane-status text-xs mb-2 " +
        (isError ? "text-red-400" : "text-slate-400");
}

async function loadLane(laneElement, subreddit, sort = "hot", time = "all") {
    setLaneStatus(laneElement, `Loading ${sort} posts from r/${subreddit}...`);

    try {
        const posts = await fetchSubredditPosts(subreddit, sort);
        renderLanePosts(laneElement, posts);
        setLaneStatus(laneElement, `Loaded ${posts.length} posts`);
    } catch (err) {
        console.error(err);
        setLaneStatus(laneElement, err.message, true);
    }
}

async function fetchSubredditPosts(subreddit, sort = "hot", time = "all") {
    const url = `${BASE_URL}/${encodeURIComponent(subreddit)}/${sort}.json`;

    if (sort === "top" || sort === "controversial") {
        url += `?t=${time}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Subreddit r/${subreddit} not found`);
        }
        throw new Error(`HTTP ${response.status} while fetching r/${subreddit}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data.children)) {
        throw new Error("Unexpected Reddit response");
    }

    return data.data.children.map((child) => child.data);
}