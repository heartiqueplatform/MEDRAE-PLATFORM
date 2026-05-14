export const ReviewCard = ({ review }: { review: any }) => {
    const reviewer = review.reviewer;

    return (
        <div className="border-b border-slate-100 py-4 last:border-0 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <img
                    src={reviewer?.avatar_url || 'https://via.placeholder.com/150'}
                    className="h-8 w-8 rounded-full object-cover bg-slate-100"
                    alt=""
                />
                <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {reviewer?.name || 'Verified User'}
                    </p>
                    <p className="text-[10px] text-slate-500">{reviewer?.institution}</p>
                </div>
                <div className="ml-auto flex text-amber-400 text-xs">
                    {[...Array(review.rating)].map((_, i) => <span key={i}>★</span>)}
                </div>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {review.comment}
            </p>
        </div>
    );
};