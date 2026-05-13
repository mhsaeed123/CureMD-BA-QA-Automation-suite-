"""
CureMD BA QA Super App - Guardrails & Authorization System
Human-in-the-loop control with multi-choice authorization before actions run
"""
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
import uuid

logger = logging.getLogger(__name__)

# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================

class ActionLevel(Enum):
    """Authorization levels for actions"""
    AUTO = "auto"              # No approval needed
    LOW = "low"                # Quick confirmation
    MEDIUM = "medium"          # Multiple choice selection
    HIGH = "high"              # Full review + confirmation
    CRITICAL = "critical"     # Explicit typed confirmation

class ActionStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"
    TIMEOUT = "timeout"

@dataclass
class ActionCard:
    """A card requesting user authorization"""
    id: str
    action_type: str
    title: str
    description: str
    options: List[Dict[str, Any]] = field(default_factory=list)
    recommended: Optional[int] = None  # Index of recommended option
    risk_level: str = "low"
    estimated_impact: str = ""
    alternatives: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    status: ActionStatus = ActionStatus.PENDING
    user_choice: Optional[Any] = None
    user_notes: Optional[str] = None

@dataclass
class TaskContext:
    """Context for a task requiring authorization"""
    task_id: str
    description: str
    plan: List[str] = field(default_factory=list)
    questions: List[Dict[str, Any]] = field(default_factory=list)
    action_cards: List[ActionCard] = field(default_factory=list)
    user_approvals: List[str] = field(default_factory=list)
    authorized: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

# ============================================================================
# GUARDRAILS SYSTEM
# ============================================================================

class GuardrailsSystem:
    """
    Guardrails system with human-in-the-loop authorization.
    Actions NEVER run without explicit user approval.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.pending_actions: Dict[str, ActionCard] = {}
        self.task_contexts: Dict[str, TaskContext] = {}
        self.action_history: List[ActionCard] = []
        self.auto_mode = False  # Default: require approval
        
    # =========================================================================
    # ACTION CARDS - Multiple choice authorization
    # =========================================================================
    
    def create_action_card(
        self,
        action_type: str,
        title: str,
        description: str,
        options: List[Dict[str, Any]],
        risk_level: str = "low",
        recommended: int = 0,
        alternatives: List[str] = None,
        estimated_impact: str = ""
    ) -> ActionCard:
        """Create an action card for user authorization"""
        card = ActionCard(
            id=f"card_{uuid.uuid4().hex[:8]}",
            action_type=action_type,
            title=title,
            description=description,
            options=options,
            recommended=recommended,
            risk_level=risk_level,
            estimated_impact=estimated_impact,
            alternatives=alternatives or [],
            status=ActionStatus.PENDING
        )
        self.pending_actions[card.id] = card
        logger.info(f"Action card created: {card.id} - {title}")
        return card
    
    def display_action_card(self, card: ActionCard) -> str:
        """Format action card for display"""
        lines = [
            f"\n{'='*60}",
            f"⚠️  ACTION CARD: {card.title}",
            f"{'='*60}",
            f"Type: {card.action_type}",
            f"Risk: {card.risk_level.upper()}",
            f"",
            f"Description: {card.description}",
        ]
        
        if card.estimated_impact:
            lines.append(f"Impact: {card.estimated_impact}")
        
        lines.append(f"\nOptions:")
        for i, opt in enumerate(card.options):
            marker = "👉 " if i == card.recommended else "   "
            lines.append(f"  {marker}[{i+1}] {opt.get('label', opt.get('text', 'Option'))}")
            if opt.get('description'):
                lines.append(f"       └─ {opt['description']}")
        
        if card.alternatives:
            lines.append(f"\nAlternatives considered:")
            for alt in card.alternatives:
                lines.append(f"  • {alt}")
        
        lines.append(f"\n{'='*60}")
        lines.append(f"Card ID: {card.id}")
        lines.append(f"{'='*60}\n")
        
        return "\n".join(lines)
    
    def approve_action(self, card_id: str, choice: Any, notes: str = None) -> bool:
        """Approve an action card"""
        if card_id not in self.pending_actions:
            logger.error(f"Action card not found: {card_id}")
            return False
        
        card = self.pending_actions[card_id]
        card.status = ActionStatus.APPROVED
        card.user_choice = choice
        card.user_notes = notes
        card.user_approval_time = datetime.now().isoformat()
        
        self.action_history.append(card)
        del self.pending_actions[card_id]
        
        logger.info(f"Action approved: {card_id}")
        return True
    
    def reject_action(self, card_id: str, reason: str = None) -> bool:
        """Reject an action card"""
        if card_id not in self.pending_actions:
            logger.error(f"Action card not found: {card_id}")
            return False
        
        card = self.pending_actions[card_id]
        card.status = ActionStatus.REJECTED
        card.user_notes = reason
        
        self.action_history.append(card)
        del self.pending_actions[card_id]
        
        logger.warning(f"Action rejected: {card_id} - {reason}")
        return True
    
    # =========================================================================
    # TASK CONTEXT - Questions before execution
    # =========================================================================
    
    def create_task_context(self, task_id: str, description: str) -> TaskContext:
        """Create a task context for authorization flow"""
        ctx = TaskContext(
            task_id=task_id,
            description=description,
            created_at=datetime.now().isoformat()
        )
        self.task_contexts[task_id] = ctx
        return ctx
    
    def add_question(
        self,
        task_id: str,
        question: str,
        question_type: str = "multiple_choice",
        options: List[str] = None,
        required: bool = True,
        follow_ups: Dict[str, str] = None
    ) -> bool:
        """Add a question to task context"""
        if task_id not in self.task_contexts:
            return False
        
        q = {
            "id": f"q_{uuid.uuid4().hex[:6]}",
            "text": question,
            "type": question_type,
            "options": options or [],
            "required": required,
            "follow_ups": follow_ups or {},
            "answer": None
        }
        self.task_contexts[task_id].questions.append(q)
        return True
    
    def add_plan_step(self, task_id: str, step: str) -> bool:
        """Add a step to the execution plan"""
        if task_id not in self.task_contexts:
            return False
        self.task_contexts[task_id].plan.append(step)
        return True
    
    def display_task_review(self, task_id: str) -> str:
        """Display full task review for user"""
        if task_id not in self.task_contexts:
            return "Task context not found"
        
        ctx = self.task_contexts[task_id]
        lines = [
            f"\n{'#'*60}",
            f"📋 TASK REVIEW: {task_id}",
            f"{'#'*60}",
            f"\nTask: {ctx.description}",
            f"\nQuestions to Answer:",
        ]
        
        for i, q in enumerate(ctx.questions):
            lines.append(f"\n  Q{i+1}. {q['text']} {'(REQUIRED)' if q['required'] else '(Optional)'}")
            if q['options']:
                lines.append("     Options:")
                for j, opt in enumerate(q['options']):
                    lines.append(f"       [{j+1}] {opt}")
        
        if ctx.plan:
            lines.append(f"\nProposed Execution Plan:")
            for i, step in enumerate(ctx.plan):
                lines.append(f"  {i+1}. {step}")
        
        if ctx.action_cards:
            lines.append(f"\nAction Cards Pending:")
            for card in ctx.action_cards:
                lines.append(f"  • {card.title} [{card.id}]")
        
        lines.append(f"\n{'#'*60}")
        lines.append(f"Authorization: {'✅ YES' if ctx.authorized else '❌ NO'} - Awaiting your GO/NO-GO")
        lines.append(f"{'#'*60}\n")
        
        return "\n".join(lines)
    
    def authorize_task(self, task_id: str, authorized: bool = True) -> bool:
        """Authorize or reject task execution"""
        if task_id not in self.task_contexts:
            return False
        
        ctx = self.task_contexts[task_id]
        ctx.authorized = authorized
        
        if authorized:
            ctx.authorization_time = datetime.now().isoformat()
            logger.info(f"Task authorized: {task_id}")
        else:
            logger.warning(f"Task rejected: {task_id}")
        
        return True
    
    def get_unanswered_questions(self, task_id: str) -> List[dict]:
        """Get questions that still need answers"""
        if task_id not in self.task_contexts:
            return []
        return [q for q in self.task_contexts[task_id].questions if q['answer'] is None]
    
    # =========================================================================
    # AUTHORIZATION DECORATOR - Guard actions
    # =========================================================================
    
    def authorize(
        self,
        action_type: str,
        level: ActionLevel = ActionLevel.MEDIUM,
        auto_approved: bool = False
    ):
        """
        Decorator to guard functions requiring authorization
        
        Usage:
            @guardrails.authorize("code_execution", ActionLevel.HIGH)
            async def execute_code(code: str):
                ...
        """
        def decorator(func: Callable):
            async def wrapper(*args, **kwargs):
                # Check if already authorized in this session
                action_key = f"{func.__name__}_{action_type}"
                
                # For now, always prompt (auto_approved is for testing only)
                if not auto_approved:
                    # Create action card
                    card = self.create_action_card(
                        action_type=action_type,
                        title=f"Confirm: {func.__name__}",
                        description=f"Action requires your authorization",
                        options=[
                            {"label": "✅ APPROVE", "value": "approve", "description": "Proceed with this action"},
                            {"label": "❌ REJECT", "value": "reject", "description": "Cancel this action"},
                            {"label": "✏️ MODIFY", "value": "modify", "description": "Suggest modifications"}
                        ],
                        risk_level=level.value
                    )
                    
                    # Display and wait for user input (in real implementation, this would be async)
                    print(self.display_action_card(card))
                    print("\n⏳ WAITING FOR YOUR AUTHORIZATION...")
                    return None  # User must explicitly approve
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    # =========================================================================
    # WORKFLOW AUTHORIZATION
    # =========================================================================
    
    def create_workflow_review(
        self,
        workflow_name: str,
        task_description: str,
        steps: List[Dict[str, Any]],
        questions: List[Dict[str, Any]] = None
    ) -> str:
        """Create a complete workflow review for user authorization"""
        workflow_id = f"wf_{uuid.uuid4().hex[:8]}"
        
        lines = [
            f"\n{'#'*70}",
            f"🚀 WORKFLOW AUTHORIZATION REQUEST",
            f"{'#'*70}",
            f"\nWorkflow: {workflow_name}",
            f"Task: {task_description}",
            f"Workflow ID: {workflow_id}",
            f"\n{'='*70}",
            f"EXECUTION STEPS",
            f"{'='*70}",
        ]
        
        for i, step in enumerate(steps):
            lines.append(f"\nStep {i+1}: {step.get('name', 'Unnamed')}")
            lines.append(f"  Tool: {step.get('tool', 'N/A')}")
            lines.append(f"  Risk: {step.get('risk', 'low').upper()}")
            if step.get('description'):
                lines.append(f"  Details: {step['description']}")
        
        if questions:
            lines.append(f"\n{'='*70}")
            lines.append(f"QUESTIONS FOR YOU")
            lines.append(f"{'='*70}")
            for i, q in enumerate(questions):
                lines.append(f"\nQ{i+1}. {q['text']}")
                if q.get('options'):
                    for j, opt in enumerate(q['options']):
                        lines.append(f"   [{j+1}] {opt}")
        
        lines.append(f"\n{'#'*70}")
        lines.append(f"TO PROCEED: Type 'GO' followed by ENTER")
        lines.append(f"TO CANCEL: Type 'STOP' followed by ENTER")
        lines.append(f"TO MODIFY: Type 'MODIFY <step_number> <changes>'")
        lines.append(f"{'#'*70}\n")
        
        return "\n".join(lines), workflow_id
    
    # =========================================================================
    # STATISTICS & HISTORY
    # =========================================================================
    
    def get_pending_actions(self) -> List[ActionCard]:
        """Get all pending action cards"""
        return list(self.pending_actions.values())
    
    def get_action_history(self, limit: int = 50) -> List[ActionCard]:
        """Get action history"""
        return self.action_history[-limit:]
    
    def get_stats(self) -> dict:
        """Get guardrails statistics"""
        approved = sum(1 for a in self.action_history if a.status == ActionStatus.APPROVED)
        rejected = sum(1 for a in self.action_history if a.status == ActionStatus.REJECTED)
        
        return {
            "pending_actions": len(self.pending_actions),
            "active_task_contexts": len(self.task_contexts),
            "total_actions": len(self.action_history),
            "approved": approved,
            "rejected": rejected,
            "approval_rate": approved / len(self.action_history) if self.action_history else 0
        }

# ============================================================================
# GLOBAL INSTANCE
# ============================================================================

_guardrails: Optional[GuardrailsSystem] = None

def get_guardrails(db=None) -> GuardrailsSystem:
    global _guardrails
    if _guardrails is None:
        _guardrails = GuardrailsSystem(db)
    return _guardrails

# ============================================================================
# CLI
# ============================================================================

def main():
    """CLI for testing guardrails"""
    gs = get_guardrails()
    
    print("\n" + "="*60)
    print("🛡️  CureMD BA QA Super App - Guardrails System")
    print("="*60)
    
    # Demo: Create an action card
    card = gs.create_action_card(
        action_type="code_execution",
        title="Execute Python Code",
        description="The agent wants to execute the following Python code:",
        options=[
            {"label": "✅ Run Code", "value": "run", "description": "Execute the code safely"},
            {"label": "❌ Cancel", "value": "cancel", "description": "Cancel execution"},
            {"label": "🔍 Review First", "value": "review", "description": "Review in detail first"}
        ],
        risk_level="medium",
        recommended=0
    )
    
    print(gs.display_action_card(card))
    
    # Demo: Create a task review
    ctx = gs.create_task_context("task_001", "Build a FHIR API endpoint")
    gs.add_question("task_001", "Which framework do you prefer?", options=["FastAPI", "Flask", "Django"])
    gs.add_question("task_001", "Add authentication?", options=["Yes", "No"])
    gs.add_question("task_001", "Any specific requirements?", question_type="text")
    gs.add_plan_step("task_001", "1. Create FastAPI app structure")
    gs.add_plan_step("task_001", "2. Add FHIR resource handlers")
    gs.add_plan_step("task_001", "3. Implement authentication")
    gs.add_plan_step("task_001", "4. Write tests")
    
    print(gs.display_task_review("task_001"))
    
    print("\n🛡️  Guardrails System Active - All actions require authorization!")

if __name__ == "__main__":
    main()
