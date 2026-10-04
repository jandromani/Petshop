import { AGENTS,type AgentKey } from "@/src/agents/registry";
import {
  isActionAllowed,isAutoExecutable,parseAgentProposal,
  type AgentProposal,
} from "@/src/agents/actions";
import { runRequiredJudges } from "@/src/judges/rules";

export type AgentReplayCase={
  key:string;
  agent:AgentKey;
  artifact:string;
  expectedPass?:boolean;
};

export function replayAgentArtifact(agent:AgentKey,artifact:string){
  const policy=AGENTS[agent];
  const proposal=parseAgentProposal(artifact);
  const actionAllowed=Boolean(proposal)&&(
    !proposal?.proposedAction||isActionAllowed(agent,proposal.proposedAction.kind)
  );
  const deterministic=runRequiredJudges(policy.requiredJudges,artifact);
  const deterministicPass=deterministic.every(x=>x.verdict==="PASS");
  const autoExecutable=Boolean(
    proposal?.proposedAction&&isAutoExecutable(proposal.proposedAction.kind)
  );
  return{
    agent,
    proposal:proposal as AgentProposal|null,
    actionAllowed,
    deterministic,
    deterministicPass,
    autoExecutable,
    pass:Boolean(proposal)&&actionAllowed&&deterministicPass,
  };
}

export function replayAgentCases(cases:AgentReplayCase[]){
  const results=cases.map(test=>({
    ...test,
    result:replayAgentArtifact(test.agent,test.artifact),
  }));
  return{
    total:results.length,
    passed:results.filter(x=>x.result.pass===x.expectedPass).length,
    results,
  };
}
