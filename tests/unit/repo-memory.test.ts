import { repoContract } from "./repo-contract";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";

repoContract("Repo contract (in-memory)", async () => createInMemoryRepo());
