import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 px-4">
            <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
            <p className="text-xl text-muted-foreground mb-8 text-center">
                お探しのページは見つかりませんでした。
            </p>
            <Button asChild>
                <Link to="/">ホームへ戻る</Link>
            </Button>
        </div>
    );
}
