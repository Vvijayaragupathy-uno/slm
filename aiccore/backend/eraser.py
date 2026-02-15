from sqlalchemy import delete
from langflow.services.database.models import Flow, MessageTable, Variable, TransactionTable, ApiKey, File
from langflow.services.deps import session_scope
from lfx.log.logger import logger

async def purge_langflow_workspace():
    """
    Clears all user-generated content from the Langflow database.
    This ensures privacy when a new student unlocks a museum station.
    """
    logger.info("🧹 AICCORE: Purging Langflow workspace for new session...")
    
    try:
        async with session_scope() as session:
            # Delete entries from core workspace tables
            # We don't delete Folders or Users to keep the system structure intact,
            # but we clear all the content within them.
            
            await session.execute(delete(Flow))
            await session.execute(delete(MessageTable))
            await session.execute(delete(Variable))
            await session.execute(delete(TransactionTable))
            await session.execute(delete(ApiKey))
            await session.execute(delete(File))
            
            await session.commit()
            logger.info("✨ AICCORE: Langflow workspace successfully cleared.")
            
    except Exception as e:
        logger.error(f"❌ AICCORE: Failed to purge Langflow workspace: {e}")
        # Note: We don't want to crash the whole station if the eraser fails,
        # but we should log it prominently.
